const Recording = require('../models/recording')
const User = require('../models/user')
const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const { sequelize } = require('../models/recording')
const polyline = require('@mapbox/polyline')
const axios = require('axios')

// Recordings routes

/**
 * @swagger
 * 
 * /recordings/me:
 *  get:
 *    tags: [Recordings]
 *    summary: Get all recordings for authenticated user
 *    responses:
 *      '200':
 *          description: A successful response
 *      '401':
 *          description: Not authenticated
 *      '403':
 *          description: Access token does not have the required scope
 *      default:
 *          description: Generic server error
 */
 router.get('/me', middleware.authenticateToken, async (req, res) => {
  try {
    const actorId = req.actor.id
    const recordings = await Recording.findAll({
      where: {
        user_id: actorId
      }
    })
    res.json(recordings)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})


/**
 * @swagger
 * 
 * /recordings/{id}:
 *  get:
 *    tags: [Recordings]
 *    summary: Get a recording by ID
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the recording
 *        schema:
 *           type: integer
 *    responses:
 *      '200':
 *          description: A successful response
 *      '401':
 *          description: Not authenticated
 *      '403':
 *          description: Access token does not have the required scope
 *      default:
 *          description: Generic server error
 */
router.get('/:id', middleware.authenticateToken, async (req, res) => {
  try {
    const id = req.params.id
    const recording = await Recording.findOne({
      where: {
        id: id
      }
    })
    if (!recording) {
      return res.status(404).json({ message: 'Recording could not be found.' })
    }
    res.json(recording)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})


module.exports = router