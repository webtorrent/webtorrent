var auto = require('run-auto')
var path = require('path')
var fs = require('fs')
var parseTorrent = require('parse-torrent')
var test = require('tape')
var TrackerServer = require('bittorrent-tracker/server')
var WebTorrent = require('../')

var leavesPath = path.resolve(__dirname, 'content', 'Leaves of Grass by Walt Whitman.epub')
var leavesFile = fs.readFileSync(leavesPath)
var leavesTorrent = fs.readFileSync(path.resolve(__dirname, 'torrents', 'leaves.torrent'))
var leavesParsed = parseTorrent(leavesTorrent)

var bunnyTorrent = fs.readFileSync(path.resolve(__dirname, 'torrents', 'big-buck-bunny-private.torrent'))
var bunnyParsed = parseTorrent(bunnyTorrent)

test('Pause and Resume a download using a REMOTE HTTP tracker (via .torrent file)', function (t) {
  pauseResumeTest(t, 'remote', 'http')
})

test('Pause and Resume a Download using UDP tracker (via .torrent file)', function (t) {
  pauseResumeTest(t, 'local', 'udp')
})

test('Pause and Resume a download using a LOCAL HTTP tracker (via .torrent file)', function (t) {
  pauseResumeTest(t, 'local', 'http')
})


function pauseResumeTest (t, testType, serverType) {
  if(testType === 'remote') t.plan(9)
  else t.plan(10)

  var trackerStartCount = 0

  auto({
    tracker: function (cb) {
      var tracker = new TrackerServer(
        serverType === 'udp' ? { http: false, ws: false } : { udp: false, ws: false }
      )

      tracker.on('error', function (err) { t.fail(err) })
      tracker.on('warning', function (err) { t.fail(err) })

      tracker.on('start', function () {
        trackerStartCount += 1
      })

      tracker.listen(function () {
        var port = tracker[serverType].address().port
        var announceUrl = serverType === 'http'
          ? 'http://127.0.0.1:' + port + '/announce'
          : 'udp://127.0.0.1:' + port
         console.log('server listening on '+announceUrl)

        // Overwrite announce with our local tracker
        leavesParsed.announce = [ announceUrl ]

        cb(null, tracker)
      })
    },

    client1: ['tracker', function (cb) {
      var client1 = new WebTorrent({ dht: false })
      client1.on('error', function (err) { t.fail(err) })
      client1.on('warning', function (err) { t.fail(err) })

      client1.add(leavesParsed)

      client1.on('torrent', function (torrent) {
        // torrent metadata has been fetched -- sanity check it
        t.equal(torrent.name, 'Leaves of Grass by Walt Whitman.epub')

        var names = [
          'Leaves of Grass by Walt Whitman.epub'
        ]

        t.deepEqual(torrent.files.map(function (file) { return file.name }), names, 'torrent file names should be equal')

        torrent.load(fs.createReadStream(leavesPath), function (err) {
          cb(err, client1)
        })
      })
    }],

    client2: ['client1', function (cb) {
      var client2 = new WebTorrent({ dht: false })
      client2.on('error', function (err) { t.fail(err) })
      client2.on('warning', function (err) { t.fail(err) })

      var count = 0, amountDownldAtPause

      if(testType === 'remote') client2.add(bunnyParsed)
      else client2.add(leavesParsed)

      client2.on('resume', function () {
        count++;
      })

	    client2.on('torrent', function (torrent){
	    	if(testType === 'remote'){
          console.log('REMOTE TEST')

			    client2.on('download', function (downloaded){
		     		if(count <= 2){ 
			        count++
				      if(count === 2){
			          setTimeout(function(){ 
			           	torrent.pause()
			           	amountDownldAtPause = torrent.downloaded
			            console.log('torrent paused')

			            setTimeout(function(){ 
			              console.log('torrent resumed')
			              torrent.resume() 
			            })
			          })
			        }
			      }else if(count === 3){
		      		t.equal(amountDownldAtPause, torrent.downloaded-downloaded, 'resume() saved previously downloaded data')
		      		return cb(null, client2)
			      }
		    	})
		    }else{
          console.log('LOCAL TEST')
		    	if(count === 0){
						setTimeout(function(){ 
	           	torrent.pause()
	            console.log('torrent paused')

	            setTimeout(function(){ 
	              console.log('torrent resumed'); 
	              torrent.resume() 
	            })
	          })
					}else{

						torrent.files.forEach(function (file) {
		          file.getBuffer(function (err, buf) {
		            if (err) throw err
		            t.deepEqual(buf, leavesFile, 'downloaded correct content')
		            gotBuffer = true
		            maybeDone()
		          })
		        })

	          torrent.once('done', function () {
	          	torrent.files.forEach(function (file) {
		            file.getBuffer(function (err, buf) {
		              if (err) throw err
		              t.deepEqual(buf, leavesFile, 'downloaded correct content')
		              gotBuffer = true
		              maybeDone()
		            })
		          })
	            t.pass('client2 downloaded torrent from client1')
	            torrentDone = true
	            maybeDone()
	          })

	          var gotBuffer = false
	          var torrentDone = false
	          function maybeDone () {
	            if (gotBuffer && torrentDone) cb(null, client2)
	          }
	        }
		    }
      })

    }]

  }, function (err, r) {
    t.error(err)
    if(testType === 'remote') t.equal(trackerStartCount, 1, 'trackerStartCount should be 1')
    else t.equal(trackerStartCount, 3, 'trackerStartCount should be 3')

    r.tracker.close(function () {
      t.pass('tracker closed')
    })

    r.client1.destroy(function () {
      t.pass('client1 destroyed')
    })
    r.client2.destroy(function () {
      t.pass('client2 destroyed')
    })
  })
}
