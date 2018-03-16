# Yata (Yet another Telegram API)

A lightweight library for communication with the Telegram Bot Api.  
To create a bot and get an api token, call the [@BotFather](https://t.me/botfather).

## TL;DR

```sh
npm install --save yata
```

```js
const yata = require('yata')

// Polling is NOT supported at the moment
const bot = new yata({
  token: BOT_API_TOKEN,
  webhook: {
    url: YOUR_DOMAIN
  }
})

// send a message
// for available methods see here: https://core.telegram.org/bots/api#available-methods
bot.call('sendMessage', {chat_id: SOME_ID, text: 'Some Text'})
  .then((response) => {console.log(response)})

// listen to messages
bot.on('/start', (msg) => {
  bot.call('sendMessage', {chat_id: msg.from.id, text: 'Heyho - Welcome to this bot'})
})

// pattern also work
// imagine someone writes "@MyBot is so much cooler than yours"
bot.on(/@(.+)bot/i, (msg, match) {
  bot.call('sendMessage', {
    chat_id: msg.from.id,
    text: `I dont think that ${match[0]} is up to discussion at the moment`
  })
})

// multiple choice
bot.on(['/start', /start/i, 'go'], () => {...})

// every message
bot.on('*', (msg) => {...})

// in case you dont use arrow functions you can also use `this` which equals `bot`
bot.on('*', function(msg) {
  this.call('sendMessage', {...})
})
```

## Modify messages before they hit your regular code

```js
// modify the message
bot.mod((update) => {
  let msg = update.message
  msg.text = msg.text.toUpperCase()
  return update
})

// load stuff async
// if you dont like how hacky this is, scroll down to "Sessions"
bot.mod(async (update) => {
  let msg = update.message
  msg.user = await loadUser(msg.from.id)
  return update
})

// cancel the request
bot.mod(() => {
  throw new Error('This was request is not allowed')
})
```

## Events

Beside the text there are many update and message events you can bind to.
Message events get passed a [message](https://core.telegram.org/bots/api#message) and update events the content of its update [update](https://core.telegram.org/bots/api#update).

To bind to an update event use `bot.onUpdate(updateType, handler)` or `bot.on(updateType, handler, 'update')`.  
Same goes for a message event: `bot.onMessage(messageType, handler)` or `bot.on(updateType, handler, 'message')`.

### Update-Events

- message
- edited_message
- channel_post
- edited_channel_post
- inline_query
- chosen_inline_result
- callback_query
- shipping_query
- pre_checkout_query

### Message-Events

Literally anything you can send via telegram

- 'text', 'audio', 'document', 'game', 'photo', 'sticker', 'video', 'voice', 'video_note',
- 'contact', 'location', 'venue', 'new_chat_members', 'left_chat_member', 'new_chat_title',
- 'new_chat_photo', 'delete_chat_photo', 'group_chat_created', 'supergroup_chat_created',
- 'channel_chat_created', 'migrate_to_chat_id', 'migrate_from_chat_id', 'pinned_message',
- 'invoice', 'successful_payment'


## Options

You can pass other options to the yata constructor

- `log: false` or a function which has the same signatur as `console.log(...args)` (default)
- `token:` Your API token
- `webhook {`
  - `url`: Your domain
  - `host: 0.0.0.0`
  - `port: 443`
  - `key`: Needed for https server
  - `cert`: Needed for https server
  - `allowed_updates: []`, Specifies which updates are pushed to your endpoint (see Update-Events for possible values)
  - `max_connections: 40`
  - `open: true`, autoopens the websocket<sup>*</sup>
  - `server`: See below<sup>\*\*</sup>
- `}`

\* In case you disable the autoopen feature you need to start it manually with `bot.setupWebhook()`  
\*\* When you pass `true`, its assumed that you setup the endpoint yourself (which is `yourdomain.example/API_TOKEN`).  
To pass an update into the library call `bot.updateState(jsonbody)`  
This is only useful when you use the server for other things as well (e.g. a website made with express)


## API

```js
const bot = new yata(...)
```

### bot.call(apiMethod, params, pluginoptions)

Calls the specified method of the api with the given params.
Returns a promise which resolves to the result or rejects with an error.

You can see all methods at the telegram api doc: https://core.telegram.org/bots/api#available-methods

### bot.setErrorHandler(fn)

Whenever a `bot.call()` failes you can of course catch the rejected promise. However sometimes its useful to have a global handler which is called when a `call` is not successful.
`setErrorHandler` allows that. The function passed needs the signature `(method, params, response)`

### bot.setupWebhook()

Only needed when you disable the `open` option of the webhook. Call it, when your server is ready for incoming messages.

Example:

```js
const router = require('someRouterFramework')

router.on('/API_TOKEN', (req, res) => {
  bot.updateState(req.body.toJSON())
  
  // Send the status code 200 to the Telegram.
  // (e.g. when using express.js)
  return res.sendStatus(200) 
})

router.listen(port, () => bot.setupWebhook())
```

### bot.mod(handler)

Add a method which is called on every update. Note it is first-come first-serve.
So the mods are executed in the order in which you added them. You can do asyncronous operations in the mod method by returning a Promise.
However always resolve to the update variable which was passed:

```js
bot.mod((update) => {
  // with promise
  return new Promise((resolve, reject) => resolve(update))
  
  // without
  return updates
})
```

### bot.plugin(handler)

Plugins let you alter requests before they are send out. A plugin function is called with `options = { method, params, plugin }` (every argument passed to `call`) and needs to return an object of the same format.
This way you can easily add functionality e.g. asking the user for something:

```js
const asks = {}

bot.plugin((options) => {
  if(options.plugin.ask) {
    asks[options.params.chat_id] = options.plugin.ask
  }
  return options
})

bot.onMessage('text', (msg) => {
  if(asks[msg.from.id]) {
    bot.emitMessage('ask.' + asks[msg.from.id], msg)
    delete asks[msg.from.id]
  }
})

bot.on('/foo', async (msg, match) => {
  return bot.call('sendMessage', {chat_id: msg.from.id, text: 'Enter foo'}, { ask: 'foo' })
})

bot.onMessage('ask.foo', async (msg) => {
  // answer to the question
  console.log(msg.text)
})
```

### bot.on(event, handler, type = 'text')

You can bind events to `update`, `message` and `text`. Update-Events have the names specified [above](#update-events), Message-Events are listed [here](#message-events).
A text event can be anything the user writes to the bot (thats why this is all seperated because a user could just write `channel_post` which would otherwise trigger the message event `channel_post`).

### bot.onUpdate, bot.onMessage, bot.onText

Shortcuts for `on(event, handler, update||message||text)`

### Examples
The below examples should be very easy to understand. Otherwise, pull requests are appreciated.

- [Use express and ngrok for development environment](https://github.com/Fuzzyma/yata/blob/master/examples/ngrok-express.js)
