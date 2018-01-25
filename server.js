const fs = require('fs')
const url = require('url')
const http = require('http')
const https = require('https')

module.exports = (bot) => {
  const token = '/' + bot.token
  const opt = bot.config.webhook

  const host = opt.host
  const port = opt.port
  const path = url.parse(opt.url).pathname
  const key = opt.key && fs.readFileSync(opt.key)
  const cert = opt.cert && fs.readFileSync(opt.cert)

  const botUrl = path && path !== '/' ? path : ''
  const fullPath = botUrl + token

  const handler = (req, res) => {
    if (req.url == fullPath && req.method == 'POST') {
      let body = ''
      req.on('data', (data) => body += data)
      req.on('end', () => {
        res.end()
        try {
          const update = JSON.parse(body)
          bot.emit('update', update)
        } catch (error) {
          bot.log('[bot.error.webhook]', error)
          res.end()
        }
      })
    }
  }

  // Create server
  const server = key && cert ?
    https.createServer({key, cert}, handler) :
    http.createServer(handler)

  // Start server
  server.listen(port, host, () => {
    bot.log(`[webhook] started${ key ? ' secure' : ''} server on "${ host }:${ port }"`)
  })
}
