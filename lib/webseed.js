module.exports = Webseed
var BLOCK_LENGTH = 16 * 1024
var url = require('url');
var http = require('http-https')
var BlockStream = require('block-stream')
var request = require('request')
var fs = require('fs');

var BLOCK_BLANK = 0
var BLOCK_RESERVED = 1
var BLOCK_WRITTEN = 2

function noop () {}

function Webseed(torrentManager, storage, parsedTorrent) {
  var self = this
  self.storage = storage
    if(parsedTorrent.urlList[0]) {
      self.download(parsedTorrent.urlList[0]);
    }
}


Webseed.prototype.download = function(file_url) {
  var self = this
  console.log(file_url);
  for(i = 0; i < self.storage.pieces.length; i++) {
    if (!self.storage.bitfield.get(i)) {
      break;
    }
  }
  var piece_index = i
  var piece = self.storage.pieces[piece_index]
  self.first_piece = piece
  var len = piece.blocks.length
  for (var i = 0; i < len; i++) {
      if (!piece.blocks[i]) {
       break; 
      }
  }
  self.first_block = i
  self.last_piece = self.first_piece
  self.last_block = self.first_block
  for(j = 0; j < 20; j++) {
    if(!self.reserveNext()) {
      console.log('break');
      break
    }
  }
  
  var first_byte = self.storage.pieces[0].blocks.length * BLOCK_LENGTH * self.first_piece.index + self.first_block * BLOCK_LENGTH;
  console.log('first byte' + first_byte)
  
  var options = {
    headers: {
			range: 'bytes='+ first_byte +  '-'
		},
    uri: file_url
  };
  console.log(options);
  var buffers = []
  var buflen = 0
  var first = false;
  self.request =  request(options);
    self.storage.on('warning', self.request.abort) 
  //var file = fs.createWriteStream("file.mp4");
 self.request.pipe(new BlockStream(BLOCK_LENGTH).on('data', self.write.bind(self)));
  /*
  request(options).on('data', function (block) {
    console.log(block.length); 
    console.log('recieved http writing');
  
    buffers.push(block);
    buflen += block.length;
    console.log(self.first_block + " : " + (self.first_piece.blocks.length - 1));
    var lastblock = (self.first_block === self.first_piece.blocks.length - 1);
    console.log(" -> left: " + (self.first_piece.length - (self.first_block * BLOCK_LENGTH)) + " " + (lastblock ? "true" : "false") );
    var need = lastblock ? self.first_piece.length - (self.first_block * BLOCK_LENGTH) : BLOCK_LENGTH;
    if(buflen >= need) {
      console.log('enogh buff')
      cur = buffers[0]
      console.log('need: ' + need);
      out = null;
      outlen = 0;
      if(cur.length < need) {
        console.log('blah');
        out = cur;
        outlen += cur.length
        buffers = buffers.slice(1)
      }
      out = Buffer.concat([out, buffers[0].slice(0, need - outlen)]);
      buffers[0] = buffers[0].slice(need - outlen);
      self.write(block);
    }
  

    });
    */
      
}

Webseed.prototype.write = function(block) {
  var self = this
  console.log('writing: ' + block.length + ' ' + self.first_block);
    self.first_piece.writeBlock(BLOCK_LENGTH * self.first_block, block, function(err) { console.log(err)} );
    if (!self.increment()) {
      console.log("Abort");
      self.request.abort();
    }
    console.log('incre : ' + self.first_piece.index + ' : ' + self.first_block);  
    self.reserveNext()
}

Webseed.prototype.increment = function() {
  var self = this
  var next = self.first_block + 1
  if(next < self.last_block) {
    self.first_block = next
    return true;
  } else if (self.first_piece.index >= self.last_piece.index) {
    return false;
  }
  
  if (next >= self.last_piece.blocks.length) {
    console.log('increamment');
    self.first_piece = self.storage.pieces[self.first_piece.index + 1]
    self.first_block = 0
    return true;
  }
  self.first_block = next
  console.log('lastfalse');
  return false;
}

Webseed.prototype.reserveNext = function() {
  var self = this
  var next = self.last_block + 1
  console.log('next = ' + next + ' len = ' + self.last_piece.blocks.length)
  if (next > self.last_piece.blocks.length) {
    console.log('upping piece')
   if(!self.storage.bitfield.get(self.last_piece.index + 1) && !self.storage.pieces[self.last_piece.index + 1].blocks[0]) {
    self.last_piece = self.storage.pieces[self.last_piece.index + 1]
    var next = 0
   } else {
    return false; 
   }
  }
  if(!self.last_piece.blocks[next]) {
   self.last_piece.blocks[next] = BLOCK_RESERVED
   self.last_block = next
   console.log('reserved : ' + self.last_piece.index + ' : ' + self.last_block);
    return true;
  }
  return false;
}