const jwt = require('jsonwebtoken')
const middleware = {
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) {
      return res.status(401).json({ message: 'You are unauthorized to perform this action' })
    }
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, user) => {
      if (err) return res.sendStatus(403)
      req.actor = user
      next()
    })
  }
}

module.exports = middleware