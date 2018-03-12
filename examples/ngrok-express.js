/**
 * Here we setup the telegram webhook
 * for our development environment. So we my use a tool
 * like ngrok which will give us an https url as well!!
 */

const yata = require('yata')
const ngrok = require('ngrok')
const express = require('express')
const bodyParser = require('body-parser')

// express app.
const app = express()
app.use(bodyParser.json())

// Setup the bot.
let bot = new yata({
	token: process.env.TELE_TOKEN,
	webhook: {
		port: 8443,
		open: false
	}
})

// A simple message listener.
bot.on('/start', (msg) => {
  bot.call('sendMessage', {chat_id: msg.from.id, text: 'Heyho - Welcome to this bot'})
})

// Pass the incoming webhook updates to the Yata library.
app.post(`/${token}`, (req) => {
	bot.updateState(req.body)
})

// Init the express app, as well as the ngrok and setting up the telegram webhook.
app.listen(3000, async () => {
	const url = await ngrok.connect('127.0.0.1:3000')
	console.log('ngrok url is: ', url)		

    // Now that we have the ngrok url, we will assign it to the Yata webhook config.
    bot.config.webhook.url = url
    
    // Easy! Yess?
	bot.setupWebhook()
})
