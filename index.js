var through2 = require('through2')
var backoff = require('backoff')
var AWS = require('aws-sdk')
var bl = require('bl')
var maxSize = 5 * 1024 * 1024

module.exports = factory

function factory(config) {
  config = config || {}
  config.apiVersion = config.apiVersion || 'latest'

  var s3 = new AWS.S3(config)
  var boSettings = {
      initialDelay: 500
    , maxDelay: 10000
  }

  return function createStream(dest) {
    if (typeof dest === 'string') dest = {
        Key: dest
      , ACL: 'public-read'
    }

    dest.Bucket = dest.Bucket || config.Bucket
    if (!dest.Bucket) throw new Error(
      'You must specify the default S3 bucket ' +
      'you wish to use; either when creating the ' +
      'stream or initialising the configuration.'
    )

    var streamClosed = false
    var buffer = bl()
    var uploadId = null
    var pending = 0
    var part = 1
    var parts = []

    var stream = through2(write, flush)
    var bo = backoff.fibonacci(boSettings)
    var lastErr


    bo.failAfter(10)
    bo.on('backoff', function() {
      s3.createMultipartUpload(dest
        , function(err, data) {
          if (err) return (lastErr = err), bo.backoff()
          uploadId = data.UploadId
          stream.emit('upload started')
        })
    }).on('fail', function() {
      return stream.emit('error', lastErr)
    }).backoff()

    return stream

    function write(chunk, enc, next) {
      buffer.append(chunk)
      if (buffer.length < maxSize) return next()
      flushChunk(next)
    }

    function flush() {
      streamClosed = true
      flushChunk()
    }

    function flushChunk(next) {
      var lastErr = null
      var chunk = part++
      var uploading = buffer.slice()
      var bo = backoff.fibonacci(boSettings)

      buffer._bufs.length = 0
      buffer.length = 0
      pending += 1

      if (!uploadId) return stream.once('upload started', uploadPart)

      uploadPart()
      function uploadPart() {
        bo.failAfter(5)
        bo.on('backoff', function() {
          s3.uploadPart({
              Body: uploading
            , Bucket: dest.Bucket
            , Key: dest.Key
            , UploadId: uploadId
            , PartNumber: chunk
          }, function(err, result) {
            if (err) return (lastErr = err), bo.backoff()

            parts[chunk-1] = {
                ETag: result.ETag
              , PartNumber: chunk
            }

            if (next) next()
            if (!--pending && streamClosed) finish()
          })
        }).on('fail', function() {
          return stream.emit('error', lastErr)
        }).backoff()
      }
    }

    function finish() {
      var bo = backoff.fibonacci(boSettings)

      bo.failAfter(10)
      bo.on('backoff', function() {
        s3.completeMultipartUpload({
            Bucket: dest.Bucket
          , Key: dest.Key
          , UploadId: uploadId
          , MultipartUpload: {
            Parts: parts
          }
        }, function(err, result) {
          if (err) return (lastErr = err), bo.backoff()
          stream.emit('end')
        })
      }).on('fail', function() {
        stream.emit('error', lastErr)
      }).backoff()
    }
  }
}
