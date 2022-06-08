const redis = require('redis')
const port = process.env.REDIS_PORT || 6379
let client = null
if (port) {
  client = redis.createClient(port)
} else {
client = redis.createClient({
  url: 'redis://red-cacivdkobjdalmrra6ag:6379'
})
}

client.connect()

client.on('connect', (value, ya) => {
  console.log( `Redis successfully listening on port ${port}`)
})

module.exports = client