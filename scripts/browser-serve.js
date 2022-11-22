import serve from 'serve-static'
import finalhandler from 'finalhandler'
import { createServer } from 'http'

createServer((req, res) => {
  serve('./')(req, res, finalhandler(req, res))
}).listen(process.env.AIRTAP_SUPPORT_PORT)
