# s3-write-stream [![Flattr this!](https://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=hughskennedy&url=http://github.com/hughsk/s3-write-stream&title=s3-write-stream&description=hughsk/s3-write-stream%20on%20GitHub&language=en_GB&tags=flattr,github,javascript&category=software)[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges) #

Pipe data straight to an S3 key of your choice.

This is a writeable stream that takes data and uploads it to Amazon S3 using
its [multipart upload API](http://aws.amazon.com/about-aws/whats-new/2010/11/10/Amazon-S3-Introducing-Multipart-Upload/).
This is ideal for handling generated content without needing to know the
content's length ahead of time, and without resorting to file system hacks or
buffering everything before the upload.

Internally, there's a fibonacci backoff handling errors, stopping the stray failed requests which tend to tear apart long-running S3 uploads.

The end result is that uploading files to S3 is as simple as this:

``` javascript
var fs = require('fs')
var upload = require('s3-write-stream')({
    accessKeyId: process.env.AWS_ACCESS_KEY
  , secretAccessKey: process.env.AWS_SECRET_KEY
  , Bucket: 'photo-album'
})

fs.createWriteStream(__dirname + '/photo_001.jpg')
  .pipe(upload('images/photo_001.jpg'))
```

## Usage ##

[![s3-write-stream](https://nodei.co/npm/s3-write-stream.png?mini=true)](https://nodei.co/npm/s3-write-stream)

### `createStream = require('s3-write-stream')(opts)` ###

Initiates the `s3-write-stream` module with your AWS configuration. The
following properties are required:

* `opts.accessKeyId`: your AWS access key id.
* `opts.secretAccessKey`: your AWS secret access id.

It's also recommended that you include `opts.Bucket` to define the default
S3 bucket you want to upload to.

### `createStream(key|opts)` ###

Creates and returns a writeable stream, that you can pipe to upload to. You
can either:

* pass the upload's `key` as a string to determine the location you
  want to upload to. By default, files uploaded this way will be public.
* pass in an `opts` object, which will pass those parameters on to the
  initial upload call via [`aws-sdk`](https://github.com/aws/aws-sdk-js).

Note that if you haven't already specified a default bucket, you'll need to do
so here and hence will need to use `opts`.

## License ##

MIT. See [LICENSE.md](http://github.com/hughsk/s3-write-stream/blob/master/LICENSE.md) for details.
