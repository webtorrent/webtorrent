#!/bin/sh

if [ "$#" -ne 1 ] || ! [ -d "$1" ]; then
  echo "Usage: $0 DIRECTORY_TO_CLONE_INTO" >&2
  exit 1
fi

pushd $1
git clone git@github.com:feross/addr-to-ip-port.git
git clone git@github.com:feross/bittorrent-dht.git
git clone git@github.com:feross/bittorrent-protocol.git
git clone git@github.com:feross/bittorrent-swarm.git
git clone git@github.com:feross/bittorrent-tracker.git
git clone git@github.com:feross/create-torrent.git
git clone git@github.com:feross/load-ip-set.git
git clone git@github.com:feross/magnet-uri.git
git clone git@github.com:feross/parse-torrent-file.git
git clone git@github.com:feross/parse-torrent.git
git clone git@github.com:feross/simple-peer.git
git clone git@github.com:feross/string2compact.git
git clone git@github.com:feross/torrent-discovery.git
git clone git@github.com:feross/ut_metadata.git
git clone git@github.com:feross/ut_pex.git
git clone git@github.com:feross/webtorrent-swarm.git
git clone git@github.com:feross/webtorrent-tracker.git
git clone git@github.com:fisch0920/bittorrent-peerid.git
git clone git@github.com:fisch0920/ip-set.git
popd
./node_modules/.bin/zelda $1
