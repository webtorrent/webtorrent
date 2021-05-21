# [1.0.0](https://github.com/webtorrent/webtorrent/compare/v0.118.0...v1.0.0) (2021-05-21)


### Bug Fixes

* bring back release config ([d78055b](https://github.com/webtorrent/webtorrent/commit/d78055b2fd6275f9ba18474f601c0a4d3284231c))
* getAnnounceOpts ([#2075](https://github.com/webtorrent/webtorrent/issues/2075)) ([633b922](https://github.com/webtorrent/webtorrent/commit/633b9224b7c7176599a5e53775de1a48d8e864b5))
* install config ([6ba44c4](https://github.com/webtorrent/webtorrent/commit/6ba44c444f6af6f070c3059ad00ca2d10868058d))
* **deps:** update webtorrent ([18a8962](https://github.com/webtorrent/webtorrent/commit/18a8962328fb42e1ebc56ed5dbe73b97f096fbd1))
* ci ([134721c](https://github.com/webtorrent/webtorrent/commit/134721c16d3338270cdcef300bb164720b1d3ae7))
* github ci secrets ([fc7ec9f](https://github.com/webtorrent/webtorrent/commit/fc7ec9f223079a3c1a2a8b54a4cca022aef4c440))


### chore

* add release ([#2077](https://github.com/webtorrent/webtorrent/issues/2077)) ([db9de2d](https://github.com/webtorrent/webtorrent/commit/db9de2d99a260d68f2719396835a09b2d0742e9f))


### Reverts

* version strategy gh actions ([1cba675](https://github.com/webtorrent/webtorrent/commit/1cba6753d449ae46f287e9104ed1f0330d640911))


### BREAKING CHANGES

* chore: add release
* add semantic release config
* Update release.yml

# WebTorrent Version History

## v0.112.0 - 2020-11-05

- Ensure that `appendTo` callback is called once video tag is added to DOM, not after play (#1967)

## v0.111.0 - 2020-11-05

- Add Local Service Discovery (BEP14)
- bitfield@4

## v0.110.1 - 2020-11-03

- Fix BEP53 implementation

## v0.110.0 - 2020-11-03

- Support Implement the peer address property (x.pe) from BEP09

## v0.109.2 - 2020-10-27

- Fix "Cannot read property 'utp' of null"

## v0.109.1 - 2020-10-23

- Peer reconnect timeout throwing error after torrent is destroyed

## v0.109.0 - 2020-10-22

- refactor torrent._rechoke()
- simple-get@4
- electron@9
- deps
- Add stale bot config
- Create no-response.yml
- Create config.yml
- Update no-response.yml
- Add uTP support (BEP29)
- check if torrent is destroyed before emitting download/upload event
- ut_pex 2.0.1
- browserify@17
- electron@10

## v0.108.6 - 2020-05-29

- update deps

## v0.108.5 - 2020-05-29

- bump deps

## v0.108.4 - 2020-05-28

- add test for downloading from a manually added peer
- fix: not setting initial wire interest
- update interest when a peer's bitfield changes

## v0.108.3 - 2020-05-15

- Create `webtorrent.chromeapp.js`
- update bittorrent-dht to version 10.0.0
- Change parseRange.parse to parseRange

## v0.108.2 - 2020-05-10

- implement store destruction option
- Fix drag-drop.min.js link
- update parse-numeric-range to version 1.2.0
- browsers: add tests for safari, edge, android, iphone

## v0.108.1 - 2020-04-01

- fix ratio calculation

## v0.108.0 - 2020-04-01

- Check if client is set when debug logging
- downgrade end-of-stream to v1.4.1
- `private` option overrides default, only if it's defined
- use native Set instead of uniq library
- Improve code readability

## v0.107.17 - 2019-11-12

- Unbreak built file

## v0.107.16 - 2019-09-10

- fix git commit reference to `http-node` package

## v0.107.15 - 2019-09-10

- Return server from server.listen for method chaining to work

## v0.107.14 - 2019-09-10

- Update .gitignore

## v0.107.13 - 2019-09-10

- Added tests to check the order of torrent events

## v0.107.12 - 2019-09-08

- Fixed how first piece's irrelevant bytes are calculated

## v0.107.11 - 2019-09-07

- Added timeout option for `requestIdlecallback` to prevent longer delays in download

## v0.107.10 - 2019-09-07

- Server now uses relative urls

## v0.107.9 - 2019-09-07

- Added a check in case user destroys torrent in response to `metadata` event

## v0.107.8 - 2019-09-07

- Fixed the torrent event emission order; now `metadata` is emitted before `ready` and `done`

## v0.107.7 - 2019-09-06

- Updated to simple-sha1@3
- Updated jsdelivr urls to use latest Webtorrent

## v0.107.6 - 2019-08-28

- Fixed XSS vulnerability in the http Server ([issue](https://github.com/brave/brave-browser/issues/5821))

## v0.107.5 - 2019-08-22

- No meaningful changes

## v0.107.4 - 2019-08-19

- Added api documentation for some torrent properties
- Bug fix: trackers now recieve 0 while seeding file instead of the file size
- Updated org-wide security policies and contributing guidelines

## v0.107.3 - 2019-08-10

- No meaningful changes

## v0.107.2 - 2019-08-09

- Scripts are now more verbose

## v0.107.1 - 2019-08-09

- Updated to stream-to-bolob-url@3
- Added `chromeapp` field to package.json for specifying Chrome App dependency substitutions

## v0.107.0 - 2019-08-07

- Smaller build with tinify
- Added size-disc script to visualize bundle

## v0.106.0 - 2019-08-05

- Updated to electron@6
- Dropped support for node versions < 10

## v0.105.3 - 2019-08-02

- Now uses 'application/octet-stream' mimetype as fallback instead of null

## v0.105.2 - 2019-07-31

- Fixed server `hostname` option to mitigate DNS rebinding attack ([issue](https://github.com/webtorrent/webtorrent/pull/1678))

## v0.105.1 - 2019-07-24

- Bug fixed: Video streaming is now fixed in Brave nightly and chromium nightly ([issue](https://github.com/brave/brave-browser/issues/5358))

## v0.105.0 - 2019-07-06

- Updated to parse-torrent@7
- Added manual verification for torrent files

## v0.104.0 - 2019-06-29

- Updated to chunk-store-stream@4
- Updated to multistream@3
- Updated to create-torrent@4
- Dropped support for node versions < 8

## v0.103.4 - 2019-06-19

- No meaningful changes

## v0.103.3 - 2019-06-19

- Updated to electron@5

## v0.103.2 - 2019-06-12

- Added the ability to close and restore streaming server

## v0.103.1 - 2019-03-11

- Updated to electron@4
- Bug fixed: File progress is no longer shown in negative

## v0.103.0 - 2018-12-11

- No longer verifies file hashes passed to seed
- No longer calls torrent.load() when seeding FS filepath
- Reduced download impact on slower computers: now download chunks at a lower priority ([rationale](https://github.com/webtorrent/webtorrent/pull/1513))

## v0.102.4 - 2018-08-31

- No meaningful changes

## v0.102.3 - 2018-08-31

- Removed xtend
- Removed the concurrency limit in browser
- Reduced installtion size by removing zero-fill
- Updated to bittorrent-dht@9

## v0.102.2 - 2018-08-28

- Update some webtorrent packages to ES6 ([webtorrent/#1443](https://github.com/webtorrent/webtorrent/issues/1443))

## v0.102.1 - 2018-08-10

- No meaningful changes

## v0.102.0 - 2018-08-04

- Updated to chunk-store-stream@3
- Updated to immediate-chunk-store@2

## v0.101.2 - 2018-07-27

- Updated to torrent-discovery@9.0.2

## v0.101.1 - 2018-07-27

- Updated to bittorrent-protocol@3
- Optimized peers:  peers now start as uninterested and only move to interested if/once they have a piece that we need  ([webtorrent/#1059](https://github.com/webtorrent/webtorrent/issues/1059))

## v0.101.0 - 2018-07-19

- No meaningful changes

## v0.100.0 - 2018-05-23

- Implemented BEP53 to alow file selection using `select only` parameter in MagnetURIs ([webtorrent/#1395](https://github.com/webtorrent/webtorrent-hybrid/issues/1395))

## v0.99.4 - 2018-05-03

- Use updated `babel-minify` minifier instead of deprecated `babili`

## v0.99.3 - 2018-04-26

- Add extra check to prevent invalid `peer.conn.remotePort` from being used ([webtorrent-hybrid/#76](https://github.com/webtorrent/webtorrent-hybrid/issues/76))

## v0.99.2 - 2018-04-24

- Use `.npmignore` to prevent unneeded files from being included in the published package

## v0.99.1 - 2018-04-24

- Expose `WebTorrent.VERSION` (#1358)
- Update to simple-get@3
- Update to parse-torrent@6

## v0.99.0 - 2018-04-19

- `renderTo()`/`appendTo()` does not autoplay by default anymore ([rationale](https://github.com/webtorrent/webtorrent/commit/fbbffbbb445096a909c851cdc4ca15204b9952b9))
  - Pass `{autoplay: true}` to `renderTo()`/`appendTo()` to get the old behavior.
- `renderTo()`/`appendTo()` has a new `muted` option to mute the video by default.

## v0.98.24 - 2018-03-02

- Add hostname option to mitigate DNS rebinding (#1260)
- Update to simple-peer@9
- Browser testing: switch from `zuul` to `airtap`

## v0.98.23 - 2018-02-20

- Update to bitfield@2

## v0.98.22 - 2018-02-17

- Update to browserify@16
- Update to bittorrent-dht@8
- Update to pump@3

## v0.98.21 - 2018-01-26

- Update to pump@2
- Update to mime@2
- Update to cross-spawn@6
- Update to browserify@15

## v0.98.20 - 2017-10-17

- Fix `file.downloaded` for last piece
- Fix destroyed torrent debug
- Update to mime@2
- Update to debug@3
- Update to electron@1

## v0.98.19 - 2017-06-25

- Add `origin` option for torrent.createServer() (#1096)
- Add `file.progress` property (#1140)
- Switch to ES6-compatible minifier

## v0.98.18 - 2017-04-14

- Transfer webtorrent from @feross to @webtorrent organization.

## v0.98.17 - 2017-04-13

- Fix uncaught exception (#1103)

## v0.98.16 - 2017-04-07

- Update to simple-peer@8

## v0.98.15 - 2017-03-30

- No meaningful changes

## v0.98.14 - 2017-03-17

- Add filename to URLs on server index page (#1078)

## v0.98.13 - 2017-03-16

- No meaningful changes

## v0.98.12 - 2017-03-13

- Fix files under 16Kb are not downloaded correctly (#1077)

## v0.98.11 - 2017-03-13

- Fix detection of seeding peers (#1076)

## v0.98.10 - 2017-03-06

- Update to bittorrent-tracker@9

## v0.98.9 - 2017-03-01

- Update to finalhandler@1
- Update to simple-peer@7

## v0.98.8 - 2017-02-13

- wait to notify() or updateInterest() at end of GC (#1044)
- Update to cross-spawn@5

## v0.98.7 - 2017-02-11

- Change os.tmpDir() to os.tmpdir() (#1043)

## v0.98.6 - 2017-02-09

- Refactor http server; support content-disposition (#1039)

## v0.98.5 - 2017-02-02

- Don't print debug log after torrent is destroyed

## v0.98.4 - 2017-02-02

- Be more defensive: prevent code from running after destroy
- Fix "Cannot read property 'complete' of null" (#1022)
- Include infoHash in torrent.js debug logs
- Update to browserify@14

## v0.98.3 - 2017-01-19

- Emit more warnings (#1021)
- Set user-agent header for http tracker requests (#1019)

## v0.98.2 - 2017-01-18

- Don't send 'completed' event to tracker on client.seed (#991)
- Set user-agent header for http tracker requests (#962)

## v0.98.1 - 2017-01-13

- Don't emit 'completed' on client.seed
- Do not choke on web seeds (#972)

## v0.98.0 - 2016-11-23

- Add property for downloaded bytes per file (`file.downloaded`) (#974)
- Cross-origin HTTP redirect workaround for web seeds (#909)

## v0.97.2 - 2016-09-26

- Creating a WebTorrent client with the `{tracker: false}` to disable communication with trackers should not affect creating a torrent with `.seed()`. The resulting torrent file should still contain the normal `announce` field. (#928)
- Add more peer ID entropy

## v0.97.1 - 2016-09-17

- Handle invalid range handers instead of throwing (#921)

## v0.97.0 - 2016-09-17

- Add option to disable BEP19 web seeds (`webSeeds` option to the `WebTorrent` constructor)

## v0.96.5 - 2016-09-13

- Fix exceptions in `server.close()` and `server.destroy()`

## v0.96.4 - 2016-08-23

- Warn when WebTorrent is installed on Node.js older than v4.0.0.

## v0.96.3 - 2016-08-22

- Better docs for .renderTo()

## v0.96.2 - 2016-08-20

- Replace 'hat' with 'randombytes'
- Better debug logs

## v0.96.1 - 2016-08-18

- Prevent possible stack overflow

## v0.96.0 - 2016-08-03

- Add options to disable autoplay/hide controls with `appendTo()` and `renderTo()`

## v0.95.6 - 2016-07-28

- Allow deselecting the entire torrent with `deselect()` to happen earlier

## v0.95.5 - 2016-07-26

- Fix support for FileList input to client.seed()

## v0.95.4 - 2016-07-26

- Skip blocklist logic when opts.blocklist is not set

## v0.95.3 - 2016-07-26

- Fix WebTorrent version string

## v0.95.2 - 2016-06-22

- HEAD requests to HTTP server should not send entire body
- WebTorrent, LLC is now the steward of the project

## v0.95.1 - 2016-06-15

- Emit 'seed' event on the torrent object

## v0.95.0 - 2016-06-15

- API: Add `file.getBlob()` method
- Fix rare exception in `lib/tcp-pool.js`

## v0.94.4 - 2016-06-10

- Support torrent with a single 0 byte file
- Use `<` since it handles `NaN` in a predictable way, i.e. `false`

## v0.94.3 - 2016-05-30

- Use `safe-buffer` for improved buffer safety

## v0.94.2 - 2016-05-28

- Fix rare exception in `lib/file.js`

## v0.94.1 - 2016-05-26

- Make WebTorrent user agent string consistent across whole codebase

## v0.94.0 - 2016-05-19

- Support exact source (xs) paramter of magnet URIs, for retreiving metadata

## v0.93.4 - 2016-05-17

- Fix rare exception caused by race condition in `lib/peer.js`

## v0.93.3 - 2016-05-13

- Don't unset `{tracker: {wrtc: false}}` option to `WebTorrent` constructor.

## v0.93.2 - 2016-05-12

- When a duplicate torrent is added, don't emit the 'infoHash' event after 'error'. The 'error' event should be the last event.

## v0.93.1 - 2016-05-08

- Remove `path-exists` dependency.

## v0.93.0 - 2016-05-08

- Move tracker options (`rtcConfig` and `wrtc`) into `opts.tracker`.

  Before:

  ```js
  var client = new WebTorrent({ rtcConfig: {}, wrtc: {} })
  ```

  After:

  ```js
  var client = new WebTorrent({ tracker: { rtcConfig: {}, wrtc: {} } })
  ```

## v0.92.0 - 2016-05-05

- Add new event: `torrent.on('noPeers', function (announceType) {})`

  Emitted whenever a DHT or tracker announce occurs, but no peers have been found.  `announceType` is either `'tracker'` or `'dht'` depending on which announce occurred to trigger this event.  Note that if you're attempting to discover peers from both a tracker and a DHT, you'll see this event separately for each.

## v0.91.4 - 2016-05-05

- Fix exception: "peer.\_destroy is not a function" when calling `torrent.pause()`

## v0.91.3 - 2016-05-04

- Fix `torrent.swarm` from causing an infinite recursion.

## v0.91.2 - 2016-04-28

- Test node v6

## v0.91.1 - 2016-04-24

- Emit 'done' event *after* sending the `'complete'` message to the tracker.

## v0.91.0 - 2016-04-21

### Added

- `client.listening` property to signal whether TCP server is listening for incoming
  connections.

- `client.dhtPort` property reflects the actual DHT port when user doesn't specify one
  (this is parallel to `client.torrentPort` for the TCP torrent listening server)

### Changed

- Merged `Swarm` class into `Torrent` object. Properties on `torrent.swarm` (like
  `torrent.swarm.wires`) now exist on `torrent` (e.g. `torrent.wires`).

- Deprecate: Do not use `torrent.swarm` anymore. Use `torrent` instead.

- `torrent.addPeer` can no longer be called before the `infoHash` event has been
  emitted.

- Remove `torrent.on('listening')` event. Use `client.on('listening')` instead.

- Remove support from `TCPPool` for listening on multiple ports. This was not used by
  WebTorrent and just added complexity. There is now a single `TCPPool` instance for the
  whole WebTorrent client.

- Deprecate: Do not use `client.download()` anymore. Use `client.add()` instead.

- Only pass `torrent.infoHash` to the Chunk Store constructor, instead of the `Torrent`
  instance itself, to prevent accidental memory leaks of the `Torrent` object by the
  store. (Open an issue if you were using other properties. They can be re-added.)

- Non-fatal errors with a single torrent will be emitted at `torrent.on('error')`. You
  should listen to this event. Previously, all torrent errors were also emitted on
  `client.on('error')` and handling `torrent.on('error')` was optional. This design is
  better since now it is possible to distinguish between fatal client errors
  (`client.on('error')`) when the whole client becomes unusable versus recoverable errors
  where only a single torrent fails (`torrent.on('error')`) but the client can continue to
  be used. However, if there is no `torrent.on('error')` event, then the error will be
  forwarded to `client.on('error')`. This prevents crashing the client when the user
  only has a listener on the client, but it makes it impossible for them to determine
  a client error versus a torrent error.

- Removed `torrent.numBlockedPeers` property. Use the `blockedPeer` event to track this
  yourself.

### Fixed

- If `client.get` is passed a `Torrent` instance, it now only returns it if it is present
  in the client.

- Errors creating a torrent with `client.seed` are now emitted on the returned `torrent`
  object instead of the client (unless there is no event listeners on
  `torrent.on('error')` as previously discussed). The torrent object is now also destroyed
  automatically for the user, as was probably expected.

- Do not return existing torrent object when duplicate torrent is added. Fire an
  `'error'` event instead.

- Memory leaks of `Torrent` object caused by many internal subclasses of WebTorrent,
  including `RarityMap`, `TCPPool`, `WebConn`, `Server`, `File`.

- `client.ratio` and `torrent.ratio` are now calculated as `uploaded / received` instead
  of `uploaded / downloaded`.

## Previous versions

We did not maintain a changelog for versions prior to v0.91.0. The initial release of WebTorrent was on Dec 4, 2013.
