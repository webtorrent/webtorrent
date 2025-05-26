import serve from 'serve-static'
import finalhandler from 'finalhandler'
import { createServer } from 'http'

// instantiate middleware only once (outside request handler)
const serveStatic = serve('./dist/')

createServer((req, res) => {
  serveStatic(req, res, finalhandler(req, res))
}).listen(process.env.AIRTAP_SUPPORT_PORT)
