module.exports = {
  log: console.log,
  token: '',
  webhook: {
    host: '0.0.0.0',
    port: 443,
    max_connections: 40,
    allowed_updates: [],
    server: false,
    open: true,
  },
  polling: false
}
