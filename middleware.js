const jwt = require('jsonwebtoken')
const User = require('./models/user.js')
const cache = require('./cache')
const middleware = {
  cache: async (req, res, next) => {

    //Cache calendar data
    if (req.query.calendar_cache) {
      try {
        let response = await cache.get(`calendar-${req.query.startsAt}${req.query.endsAt}`)
        if (response) {
          req.body.calendar_cached = true
          const dates = JSON.parse(response)
          return res.json(dates)
        } else {
          req.body.calendar_cached = false
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