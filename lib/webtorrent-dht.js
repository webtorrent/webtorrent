/*! webtorrent. MIT License. WebTorrent LLC <https://webtorrent.io/opensource> */
import EventEmitter from 'events';
import { Client as DHT } from 'bittorrent-dht';

/**
 * Вспомогательная функция для настройки DHT
 */
function initializeDHT(client, dhtPort) {
  const dht = new DHT({ nodeId: client.nodeId });

  dht.on('ready', () => {
    console.log('DHT готов и слушает на порту', dhtPort);
    dht.announce(client.nodeId, dhtPort, () => {
      console.log('Узел объявлен в DHT:', client.nodeId);
    });
  });

  dht.on('peer', (peer, infoHash) => {
    console.log(`Найден пир ${peer.host}:${peer.port} для infoHash ${infoHash}`);
  });

  dht.listen(dhtPort, () => {
    console.log('DHT слушает на порту', dhtPort);
  });

  return dht;
}

/**
 * Измененный WebTorrent-клиент с интеграцией DHT
 */
class WebTorrentWithDHT extends EventEmitter {
  constructor(opts = {}) {
    super();

    this.peerId = opts.peerId || 'peer-id';
    this.nodeId = opts.nodeId || 'node-id';
    this.dhtPort = opts.dhtPort || 20000;

    console.log('Инициализация DHT...');
    this.dht = initializeDHT(this, this.dhtPort);
  }

  addTorrent(torrent) {
    console.log('Добавлен торрент:', torrent);
    this.dht.lookup(torrent);
  }
}

export default WebTorrentWithDHT;