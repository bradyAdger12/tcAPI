const redis = require('redis')
const port = process.env.REDIS_PORT || null
let client = null
if (port) {
  client = redis.createClient(port)
} else {
client = redis.createClient({
  url: 'rediss://red-cacivdkobjdalmrra6ag:QhnmQZoq2GV6dz4N8gVPOaksMEhUqElk@oregon-redis.render.com:6379'
})
}

client.connect()

client.on('connect', (value, ya) => {
  console.log( `Redis successfully listening on port ${port}`)
})

module.exports = client