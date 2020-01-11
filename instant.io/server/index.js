var compress = require("compression")
var cors = require("cors")
var express = require("express")
var http = require("http")
/*
had to install pug globally
npm install -g pug
local install fails
*/
var pug = require("pug")
var path = require("path")
// var util = require('util')

var config = require("../config")

var PORT = 8020

var CORS_WHITELIST = [
  "https://webtorrent.ibinti.com",
  "https://ibinti.com"
]

var secret = {}

var app = express()
var server = http.createServer(app)

// Trust "X-Forwarded-For" and "X-Forwarded-Proto" nginx headers
app.enable("trust proxy")

// Disable "powered by express" header
app.set("x-powered-by", false)

// Use pug for templates
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "pug")
app.engine("pug", pug.renderFile)

// Pretty print JSON
app.set("json spaces", 2)

// Use GZIP
app.use(compress())

app.use(function (req, res, next) {
  // Use HTTP Strict Transport Security
  // Lasts 1 year, incl. subdomains, allow browser preload list
  if (config.isProd) {
    res.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    )
  }

  // Add cross-domain header for fonts, required by spec, Firefox, and IE.
  var extname = path.extname(req.url)
  if ([".eot", ".ttf", ".otf", ".woff", ".woff2"].indexOf(extname) >= 0) {
    res.header("Access-Control-Allow-Origin", "*")
  }

  // Prevents IE and Chrome from MIME-sniffing a response. Reduces exposure to
  // drive-by download attacks on sites serving user uploaded content.
  res.header("X-Content-Type-Options", "nosniff")

  // Prevent rendering of site within a frame.
  res.header("X-Frame-Options", "DENY")

  // Enable the XSS filter built into most recent web browsers. It's usually
  // enabled by default anyway, so role of this headers is to re-enable for this
  // particular website if it was disabled by the user.
  res.header("X-XSS-Protection", "1; mode=block")

  // Force IE to use latest rendering engine or Chrome Frame
  res.header("X-UA-Compatible", "IE=Edge,chrome=1")

  next()
})

app.use(express.static(path.join(__dirname, "../static")))

app.get("/", function (req, res) {
  res.render("index", {
    title: "streaming file transfer over webtorrent"
  })
})

// Fetch new iceServers from twilio token regularly
// var iceServers
// var twilioClient
// try {
//   twilioClient = twilio(secret.twilio.accountSid, secret.twilio.authToken)
// } catch (err) {}

// function updateIceServers () {
//   twilioClient.tokens.create({}, function (err, token) {
//     if (err) return console.error(err.message || err)
//     if (!token.iceServers) {
//       return console.error('twilio response ' + util.inspect(token) + ' missing iceServers')
//     }

//     // Support new spec (`RTCIceServer.url` was renamed to `RTCIceServer.urls`)
//     iceServers = token.iceServers.map(function (server) {
//       if (server.url != null) {
//         server.urls = server.url
//         delete server.url
//       }
//       return server
//     })
//   })
// }

// if (twilioClient) {
//   setInterval(updateIceServers, 60 * 60 * 4 * 1000).unref()
//   updateIceServers()
// }

// WARNING: This is *NOT* a public endpoint. Do not depend on it in your app.
app.get("/__rtcConfig__", cors({
  origin: function (origin, cb) {
    var allowed = CORS_WHITELIST.indexOf(origin) >= 0 ||
      /https?:\/\/localhost(:|$)/.test(origin) ||
      /https?:\/\/airtap\.local(:|$)/.test(origin)
    cb(null, allowed)
  }
}), function (req, res) {
  // console.log('referer:', req.headers.referer, 'user-agent:', req.headers['user-agent'])
  var iceServers = secret.iceServers

  if (!iceServers) return res.status(404).send({ iceServers: [] })
  res.send({
    comment: "warning: this is *not* a public endpoint. do not depend on it in your app",
    iceServers: iceServers
  })
})

app.get("/500", (req, res, next) => {
  next(new Error("manually visited /500"))
})

app.get("*", function (req, res) {
  res.status(404).render("error", {
    title: "404 page not found",
    message: "404 not found"
  })
})

// error handling middleware
app.use(function (err, req, res, next) {
  console.error(err.stack)
  const code = typeof err.code === "number" ? err.code : 500
  res.status(code).render("error", {
    title: "500 internal server error",
    message: err.message || err
  })
})

server.listen(PORT, "0.0.0.0", function () {
  console.log("i am listening on port %s", server.address().port)
})