const EventEmitter = require('events')
const defaultConfig = require('./config')
const server = require('./server.js')
const endpoint = 'https://api.telegram.org/bot'
const deepAssign = require('deep-assign')
const request = require('request-promise-native')
const stream = require('stream')
const path = require('path')
const url = require('url')
const fs = require('fs')

const defaultFiles = {
  photo: 'jpg', audio: 'mp3', document: 'doc',
  sticker: 'webp', voice: 'm4a', video: 'mp4'
}

const formDataKeys = [...Object.keys(defaultFiles), 'formData']

// see https://core.telegram.org/bots/api#message
const messageTypes = [
  'text', 'audio', 'document', 'game', 'photo', 'sticker', 'video', 'voice', 'video_note',
  'contact', 'location', 'venue', 'new_chat_members', 'left_chat_member', 'new_chat_title',
  'new_chat_photo', 'delete_chat_photo', 'group_chat_created', 'supergroup_chat_created',
  'channel_chat_created', 'migrate_to_chat_id', 'migrate_from_chat_id', 'pinned_message',
  'invoice', 'successful_payment'
]

class Botty {
  constructor (config = {}) {
    this.events = []
    this.mods = []
    this.config = deepAssign ({}, defaultConfig, config)

    this.token = this.config.token

    if(!this.token) throw new Error('No token specified in config')

    this.url = endpoint + this.token + '/'
    
    if(this.config.polling) {
      this.setupPolling()
    } else if (this.config.webhook.open) {
      this.setupWebhook()
    }
  }

  log (...args) {
    this.config.log && this.config.log(...args)
  }

  makeFlat (obj) {
    for(let i in obj) {
      if(typeof obj[i] == 'object') {
        obj[i] = JSON.stringify(obj[i])
      }
    }

    return obj
  }

  hasFormData (obj) {
    for(let i in obj) {
      if(formDataKeys.includes(i)) return true
    }
    return false
  }


  makeFormData (obj) {
    // in case the user really knows what he is doing
    if(obj['formData']) return obj['formData']

    for(let i in obj) {
      if(formDataKeys.includes(i)) {
        let file = obj[i]
        let type = i
        let filename = obj.filename || 'file.'+defaultFiles[type]

        if(typeof file == 'string') {

          throw new Error('No string!!!!')

          filename = obj.filename || path.basename(file)
          if (url.parse(file).hostname) {
            file = request.get(file)
          } else {
            file = fs.createReadStream(file)
          }
        }

        if (file instanceof stream.Readable || file instanceof Buffer) {
          obj[i] = {
            value: file,
            options: {filename}
          }
        }
      }
    }

    return obj
  }

  call (method, obj) {
    var options = {
      uri: this.url + method,
      json: true
    }

    if(this.hasFormData(obj)) {
      options.method = 'POST'
      options.formData = this.makeFormData(obj)
    } else {
      options.qs = this.makeFlat(obj)
    }

    return request(options).then((response) => {
      if(!response.ok) throw new Error(response.error)
      return response.result
    })
  }

  setupWebhook () {
    return this.call('setWebhook', {
      url: this.config.webhook.url + '/' + this.config.token,
      certificate: this.config.webhook.certificate,
      max_connections: this.config.webhook.max_connections,
      allowed_updates: this.config.webhook.allowed_updates
    }).then(() => this.startServer())
    .catch((e) => {
      this.log('[webhook] Could not setup webhook:', e)
    })
  }

  setupPolling () {
    throw new Error('Polling is not implemented. Feel free to submit a PR')
  }

  startServer () {
    this.on('update', (update) => this.updateState(update))
    if(!this.config.webhook.server) {
      server(this)
    }
  }

  modRun (update) {
    var promise = Promise.resolve(update)
    for(let mod of this.mods) {
      promise = promise.then(mod)
    }
    return promise
  }

  callHandler (update) {
    // there is only ONE updateType per update (see https://core.telegram.org/bots/api#update)
    // so it has to be the key which is not 'update_id'
    let updateType
    for(updateType in update) {
      if(updateType != 'update_id') break
    }

    // emit the updateType as event so user has access to everything
    this.emit(updateType, update)

    // if we get a message of any kind we check the type
    // we do NOT check for edited_message channel posts because this will screw up the handlers
    // the user has to manage edited stuff itself by bynding to the update directly
    if(updateType == 'message' || updateType == 'channel_post') {

      let msg = update[updateType]

      // for any type we emit an event
      for(let messageType in msg) {
        if(messageTypes.includes(messageType)) {
          this.emit(messageType, msg)
        }
      }

      // when the message has text we also emit the text as event
      if(msg.text) {
        this.emit(msg.text, msg)
      }
    }
  }

  async updateState (update) {
    try {
      update = await this.modRun(update)
      this.callHandler(update)
    } catch(e) {
      this.log('[update] Update was blogged from mod:', e)
    }
  }

  mod (mod) {
    this.mods.push(mod)
  }

  on(pattern, fn) {
    pattern = Array.isArray(pattern) ? pattern : [pattern]
    pattern.forEach((pattern) => this.events.push({pattern, fn}))
  }

  emit(eventName, relevantData) {
    for(let event of this.events) {
      let match
      if(event.pattern == '*' || event.pattern == eventName || (event.pattern instanceof RegExp && (match = eventName.match(event.pattern)))) {
        event.fn.call(this.call.bind(this), relevantData, match)
      }
    }
  }
}

module.exports = Botty