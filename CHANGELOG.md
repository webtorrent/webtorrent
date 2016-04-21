# WebTorrent Version History

## UNRELEASED

### Added

- `client.listening` property to signal whether TCP server is listening for incoming
  connections.

### Changed

- Merged `Swarm` class into `Torrent` object. Properties on `torrent.swarm` (like
  `torrent.swarm.wires`) now exist on `torrent` (e.g. `torrent.wires`).

- `torrent.addPeer` can no longer be called before the `infoHash` event has been
  emitted.

- Remove `torrent.on('listening')` event. Use `client.on('listening')` instead.

- Remove support from `TCPPool` for listening on multiple ports. This was not used by
  WebTorrent and just added complexity. There is now a single `TCPPool` instance for the
  whole WebTorrent client.

- Deprecate: Do not use `client.download()` anymore. Use `client.add()` instead.

- Deprecate: Do not use `torrent.swarm` anymore. Use `torrent` instead.

### Fixed

- When there is a `torrent.on('error')` listener, don't also emit
  `client.on('error')`.

- Do not return existing torrent object when duplicate torrent is added. Fire an
  `'error'` event instead.

- Memory leaks of `Torrent` object caused by various internal subclasses of WebTorrent,
  including `RarityMap`, `TCPPool`, `WebConn`, `Server`.

- `client.ratio` and `torrent.ratio` are now calculated as `uploaded / received` instead
  of `uploaded / downloaded`.
