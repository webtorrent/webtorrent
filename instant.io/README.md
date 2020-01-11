<h1 align="center">Streaming file transfer over WebTorrent (torrents on the web)</h1>

Download/upload files using the [WebTorrent](http://webtorrent.io) protocol (BitTorrent
over WebRTC). This is a beta.

Powered by [WebTorrent](http://webtorrent.io), the first torrent client that works in the
browser without plugins. WebTorrent is powered by JavaScript and WebRTC. Supports Chrome,
Firefox, Opera (desktop and Android). Run <code>localStorage.debug = '*'</code> in the
console and refresh to get detailed log output.

## Install

If you just want to do file transfer on your site, or fetch/seed files over WebTorrent, then there's no need to run a copy of instant.io on your own server. Just use the WebTorrent script directly.

## Tips

1. Create a shareable link by adding a torrent infohash or magnet link to the end
of the URL. For example: `https://instant.io#INFO_HASH` or `https://instant.io/#MAGNET_LINK`.

2. You can add multiple torrents in the same browser window.

## License

MIT. Copyright (c) [WebTorrent, LLC](https://webtorrent.io).

