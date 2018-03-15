/**
 * Here we setup the telegram webhook
 * for our development environment. So we my use a tool
 * like ngrok which will give us an https url as well!!
 */

const yata = require('yata')
const ngrok = require('ngrok')
const express = require('express')
const bodyParser = require('body-parser')

// Setup the express.js
const app = express()
app.use(bodyParser.json())

// Init the express app.
app.listen(3000, async () => {
	// Get a new URL from ngrok.
	const url = await ngrok.connect('127.0.0.1:3000')
	// Set up the telegram webhook.
	const bot = new yata({
		token: process.env.TELE_TOKEN,
		webhook: {
			url: url,
			port: 8443,
		server: true			
		}
	})

	
	
	/**
	* Do somthing with bot here. 
	*/
	bot.on('/start', (msg) => {
		bot.call('sendMessage', {chat_id: msg.from.id, text: 'HeyhoWelcome to this bot'})
	})

	
	
	// Get the Telegram webhook updates and pass them to the Yata. 
	app.post(`/${process.env.TELE_TOKEN}`, (req, res) => {
		bot.updateState(req.body)

		return res.sendStatus(200)
	})
})
