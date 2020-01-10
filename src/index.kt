package kotorrent

/* global FileList */

val concat = require("simple-concat")
val createTorrent = require("create-torrent")
val debug = require("debug")("webtorrent")
val DHT = require("bittorrent-dht/client") // browser exclude
val loadIPSet = require("load-ip-set") // browser exclude
val parallel = require("run-parallel")
val parseTorrent = require("parse-torrent")
val path = require("path")
val Peer = require("simple-peer")
val randombytes = require("randombytes")
val speedometer = require("speedometer")

val TCPPool = require("../lib/tcp-pool") // browser exclude
val Torrent = require("../lib/torrent")
val VERSION = require("../package.json").version

/**
 * Version number in Azureus-style. Generated from major and minor semver version.
 * For example:
 *   '0.16.1' -> '0016'
 *   '1.2.5' -> '0102' 
 *   '0.07.17' -> '0007'
 *   '0.107.17' -> '0007' <- how to handle this? two digit scheme is flawed, obviously cannot handle 3 digit minor version 
 */
val VERSION_STR = version_azureus(VERSION)

/**
 * Version prefix string (used in peer ID). WebTorrent uses the Azureus-style
 * encoding: '-', two characters for client id ('WW'), four ascii digits for version
 * number, '-', followed by random numbers.
 * For example:
 *   '-WW0102-'...
 */
val VERSION_PREFIX = "-WW${VERSION_STR}-"

/**
 * WebTorrent Client
 * @param {Object=} opts
 */
@JsModule("../node_modules/events")
external abstract class EventEmitter(){}
class WebTorrent : EventEmitter {




}