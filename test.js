var config = require('./test-config.js')
var request = require('request')
var from = require('from')
var test = require('tape')
var fs = require('fs')
var bl = require('bl')
var s3 = require('./')

var testKey = 'testing-s3-write-stream'
var largeUploadSize = 20*1024*1024
var loremBuffer = new Buffer([
    'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod'
  , 'tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,'
  , 'quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo'
  , 'consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse'
  , 'cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non'
  , 'proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
].join('\n'))

console.error('')
console.error('Just a quick warning: this test requires uploading')
console.error('a 20MB file, so it could take a while.')
console.error('')

test('config sanity check', function(t) {
  console.error('Test config:')
  console.error(JSON.stringify(config, null, 2))
  console.error()
  t.plan(3)
  t.ok(config.bucket, '"bucket" property should be defined in ./test-config.js')
  t.ok(config.access, '"access" property should be defined in ./test-config.js')
  t.ok(config.secret, '"secret" property should be defined in ./test-config.js')
})

// @todo: test bigger uploads
test('basic upload', function(t) {
  t.plan(3)

  var createStream = s3({
      secretAccessKey: config.secret
    , accessKeyId: config.access
    , Bucket: config.bucket
  })

  var counter = 0
  var uploadStream = createStream(testKey)

  fs.createReadStream(__filename)
    .once('error', t.ifError.bind(t))
    .pipe(uploadStream)
    .once('error', t.ifError.bind(t))
    .once('end', check)

  function check() {
    t.pass('successfully completed upload process')

    request.get(
      'https://s3.amazonaws.com/' +
      (config.bucket + '/' + testKey).replace(/\/\//g, '/')
    ).pipe(bl(function(err, contents) {
      t.ifError(err, 'request finished succesfully')
      t.equal(
          String(contents)
        , fs.readFileSync(__filename, 'utf8')
        , 'uploaded file has same contents as local'
      )
    }))
  }
})

test('larger upload', function(t) {
  t.plan(3)

  var buffer = bl()
  var createStream = s3({
      secretAccessKey: config.secret
    , accessKeyId: config.access
    , Bucket: config.bucket
  })

  var counter = 0
  var uploadStream = createStream(testKey)

  from(function(_, next) {
    counter += loremBuffer.length
    if (counter > largeUploadSize)
      return this.emit('end'), false
    var chunk = loremBuffer.slice()
    buffer.append(chunk)
    this.emit('data', chunk)
    return true
  }).pipe(uploadStream)
    .once('error', t.ifError.bind(t))
    .once('end', check)

  function check() {
    t.pass('successfully completed upload process')

    request.get(
      'https://s3.amazonaws.com/' +
      (config.bucket + '/' + testKey).replace(/\/\//g, '/')
    ).pipe(bl(function(err, contents) {
      t.ifError(err, 'request finished succesfully')
      t.equal(
          String(contents)
        , String(buffer.slice())
        , 'uploaded file has same contents as local stream'
      )
      t.end()
    }))
  }
})
