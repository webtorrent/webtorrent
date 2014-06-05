#!/bin/sh

if [ "$#" -ne 1 ] || ! [ -d "$1" ]; then
  echo "Usage: $0 DIRECTORY_TO_CLONE_INTO" >&2
  exit 1
fi

pushd $1
git clone git@github.com:feross/bittorrent-client.git
git clone git@github.com:feross/bittorrent-dht.git
git clone git@github.com:feross/bittorrent-peerid.git
git clone git@github.com:feross/bittorrent-protocol.git
git clone git@github.com:feross/bittorrent-swarm.git
git clone git@github.com:feross/bittorrent-tracker.git
git clone git@github.com:feross/magnet-uri.git
git clone git@github.com:feross/parse-torrent.git
git clone git@github.com:feross/string2compact.git
git clone git@github.com:feross/ut_metadata.git
git clone git@github.com:feross/ut_pex.git
popd
./node_modules/.bin/zelda $1
