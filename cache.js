const redis = require('redis')
const port = process.env.REDIS_PORT || 6379
let client = null
if (port) {
  client = redis.createClient(port)
} else {
client = redis.createClient({
  url: 'rediss://red-cacivdkobjdalmrra6ag:QhnmQZoq2GV6dz4N8gVPOaksMEhUqElk@oregon-redis.render.com'
})
}

client.connect()

client.on('connect', (value, ya) => {
  console.log( `Redis successfully listening on port ${port}`)
})

module.exports = client