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

bot.on(['/start', /start/i, 'go'], () => {...})

// every message
bot.on('*', (msg, match) => {...})
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
bot.mod('updates', () => {
  throw new Error('This was request is not allowed')
})
```

## Events

Beside the text there are many update and message events you can bind to.
Some of them pass the [message](https://core.telegram.org/bots/api#message) and some a whole [update](https://core.telegram.org/bots/api#update).

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
\*\* When you pass `true`, its assumed that you setup the endpoint yourself (which is `yourdomain.example/token`).  
To pass an update into the library call `bot.updateState(jsonbody)`  
This is only useful when you use the server for other things as well (e.g. a website made with express)
