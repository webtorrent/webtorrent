
var DHT = require('./');
var async = require('async');

async.eachSeries(
//async.each(
    [
        'e756b6ed7f1f647db2ea7e153e2fdc6226218a1f',
     //   'e756b6ed7f1f647db2ea7e153e2fdc6226218a1f',
        '948cd498ab5acdc0a61dee8b012eb93ae231b2ff',
    ], 
    function(hash, callback) {
        var dht = new DHT(new Buffer(hash, 'hex'));
        dht.findPeers(300);

        var peers = [], start = Date.now(), i = 0;
        dht.on('peer', function(peer) {
            //console.log(hash, ++i); // DEBUG
            peers.push(peer);
            
            if (peers.length != 300) return;
            console.log("\n\n\nready: "+(Date.now() - start)+"\n\n"); // 2 - 3 seconds
            //setTimeout(callback, 4000);
            callback();
        });
    }
);
