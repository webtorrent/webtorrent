# WebTorrent Version History

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

- Fix exception: "peer._destroy is not a function" when calling `torrent.pause()`

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
