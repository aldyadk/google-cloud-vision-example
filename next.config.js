require('dotenv').config()

module.exports = {
    env: {
        CV_API_KEY: process.env.CLOUD_VISION_API_KEY,
        BUCKET_NAME: process.env.BUCKET_NAME,
        GOOGLE_CREDS: process.env.GOOGLE_CREDS,
    }
}