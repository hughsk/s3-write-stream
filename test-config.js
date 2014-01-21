module.exports = {
    bucket: process.env.S3_STREAM_TEST_BUCKET || ''
  , access: process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID
  , secret: process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY
}
