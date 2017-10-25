var base64Img = require('base64-img')

var data = base64Img.base64Sync('data/data2.3MB.JPG')
fs.writeFileSync('data/data2.3MB.base64', data, 'utf-8')

var data = base64Img.base64Sync('data/PANO_20160512_133940.jpg')
fs.writeFileSync('data/data2.5MB.base64', data, 'utf-8')

var data = base64Img.base64Sync('data/PANO_20160519_101201.jpg')
fs.writeFileSync('data/data2.7MB.base64', data, 'utf-8')

var data = base64Img.base64Sync('data/PANO_20160525_154617.jpg')
fs.writeFileSync('data/data2.9MB.base64', data, 'utf-8')

var data = base64Img.base64Sync('data/PANO_20160518_102006.jpg')
fs.writeFileSync('data/data3.4MB.base64', data, 'utf-8')