// TODO: support blocklists

module.exports = WebTorrent;

<<<<<<< HEAD
var Client = require('bittorrent-client'),
  fs = require('fs'),
  http = require('http'),
  inherits = require('inherits'),
  mime = require('mime'),
  rangeParser = require('range-parser');
=======
var Client = require('bittorrent-client')
var fs = require('fs')
var http = require('http')
var inherits = require('inherits')
>>>>>>> 25c9080664a9d8814442d2e867dfeee0ff8b3a57

inherits(WebTorrent, Client);

function WebTorrent (opts) {
  var self = this;
  Client.call(self, opts);
  if (!opts){
    opts = {};
  }
  if (opts.list) {
    return;
  }
<<<<<<< HEAD

  self._startServer();

=======
  
>>>>>>> 25c9080664a9d8814442d2e867dfeee0ff8b3a57
  self.on('torrent', function (torrent) {
    self._onTorrent(torrent);
  });

  // TODO: add event that signals that all files that are "interesting" to the user have
  // completed and handle it by stopping fetching additional data from the network
}

WebTorrent.prototype.add = function (torrentId, cb) {
  var self = this;
  if (typeof cb !== 'function'){
    cb = function () {};
  }

  // TODO: support passing in an index to file to download
  // self.index = opts.index

  if (!self.ready) {
    return self.once('ready', self.add.bind(self, torrentId, cb));
  }

  // Called once we have a torrentId that bittorrent-client can handle
  function onTorrentId (torrentId) {
<<<<<<< HEAD
    var torrent = Client.prototype.add.call(self, torrentId, cb); // will emit 'torrent' event
    cb(null, torrent);
=======
    Client.prototype.add.call(self, torrentId, cb)
>>>>>>> 25c9080664a9d8814442d2e867dfeee0ff8b3a57
  }

  if (Client.toInfoHash(torrentId)) {
    // magnet uri, info hash, or torrent file can be handled by bittorrent-client
    process.nextTick(function () {
      onTorrentId(torrentId);
    });
  } else if (/^https?:/.test(torrentId)) {
    // http or https url to torrent file
    http.get(torrentId, function (res) {
      res.pipe(concat(function (torrent) {
        onTorrentId(torrent);
      }));
    }).on('error', function (err) {
      cb(new Error('Error downloading torrent from ' + torrentId + '\n' + err.message));
    });
  } else {
    // assume it's a filesystem path
    fs.readFile(torrentId, function (err, torrent) {
      if (err) {
<<<<<<< HEAD
        return cb(new Error('Cannot add torrent. Require one of: magnet uri, ' +
          'info hash, torrent file, http url, or filesystem path'));
=======
        return cb(new Error('Cannot add torrent "' + torrentId + '". Torrent id must be one of: magnet uri, ' +
          'info hash, torrent file, http url, or filesystem path.'))
>>>>>>> 25c9080664a9d8814442d2e867dfeee0ff8b3a57
      }
      onTorrentId(torrent);
    });
  }

  return self;
};

WebTorrent.prototype._onTorrent = function (torrent) {
<<<<<<< HEAD
  var self = this;
  console.log('got metadata');
  console.log('files:\n', torrent.files.map(function (f) { return f.name; }).join('\n'));
=======
  var self = this
>>>>>>> 25c9080664a9d8814442d2e867dfeee0ff8b3a57

  // if no index specified, use largest file
  // TODO: support torrent index selection correctly -- this doesn't work yet
  /*if (typeof torrent.index !== 'number') {
    var largestFile = torrent.files.reduce(function (a, b) {
      return a.length > b.length ? a : b;
    });
    torrent.index = torrent.files.indexOf(largestFile);
  }

  // TODO
<<<<<<< HEAD
  torrent.files[torrent.index].select();
};

WebTorrent.prototype._startServer = function () {
  var self = this;
  self.server = http.createServer();
  self.server.on('request', self._onRequest.bind(self));
};

WebTorrent.prototype._onRequest = function (req, res) {
  var self = this;

  if (!self.ready) {
    return self.once('ready', self._onRequest.bind(self, req, res));
  }

  var u = url.parse(req.url);

  if (u.pathname === '/favicon.ico') {
    return res.end();
  }
  if (u.pathname === '/') {
    u.pathname = '/' + self.index;
  }

  var i = Number(u.pathname.slice(1));

  if (isNaN(i) || i >= e.files.length) {
    res.statusCode = 404;
    return res.end();
  }

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mime.lookup(file.name));

  var file = e.files[i],
    range = req.headers.range;

  if (!range) {
    res.statusCode = 206;
    res.setHeader('Content-Length', file.length);
    if (req.method === 'HEAD') {
      return res.end();
    }
    pump(file.createReadStream(), res);
    return;
  }

  range = rangeParser(file.length, range)[0]; // don't support multi-range reqs
  res.statusCode = 206;

  var rangeStr = 'bytes ' + range.start + '-' + range.end + '/' + file.length;
  res.setHeader('Content-Range', rangeStr);
  res.setHeader('Content-Length', range.end - range.start + 1);

  if (req.method === 'HEAD') {
    return res.end();
  }
  pump(file.createReadStream(range), res);
};
=======
  torrent.files[torrent.index].select()*/
}
>>>>>>> 25c9080664a9d8814442d2e867dfeee0ff8b3a57
