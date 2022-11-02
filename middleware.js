const jwt = require('jsonwebtoken')
const User = require('./models/user.js')
const cache = require('./cache')
const middleware = {
  cache: async (req, res, next) => {
    //Cache calendar data
    const path = req._parsedUrl.path
    if (path) {
      try {
        let response = await cache.get(path)
        const data = JSON.parse(response)
        if (data) {
          return res.json({ summary: data })
        }
      } catch (e) {
        console.log(e)
      }
    }
    next()
  },
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) {
      return res.status(401).json({ message: 'You are unauthorized to perform this action' })
    }
    jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, user) => {
      if (err) return res.sendStatus(403)
      req.actor = await User.findOne({
        where: {
          id: user.id
        }
      })
      next()
    })
  }
}

module.exports = middleware