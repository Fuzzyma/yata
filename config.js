module.exports = {
  log: console.log,
  webhook: {
    host: '0.0.0.0',
    port: 443,
    max_connections: 40,
    allowed_updates: [],
    server: null,
    open: true,
  },
  polling: false
}
