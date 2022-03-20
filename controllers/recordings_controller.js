const Recording = require('../models/recording')
const User = require('../models/user')
const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const { sequelize } = require('../models/recording')
const polyline = require('@mapbox/polyline')
const axios = require('axios')
const data = require('../stream_data.js')

// Recordings routes



/**
 * @swagger
 * 
 * /recordings/stats/test:
 *  get:
 *    tags: [Recordings]
 *    summary: Test recording stream data
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
 router.get('/stats/test', async (req, res) => {
  try {
    const user = await User.findOne({
      where: {
        id: 34
      }
    })
    const hrZones = user.hr_zones
    const powerZones = user.power_zones
    const stats = Recording.getStats(data, hrZones, powerZones)
    res.json(stats)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

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
      order: [
        // Will escape title and validate DESC against a list of valid direction parameters
        ['started_at', 'DESC']],
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

/**
 * @swagger
 * 
 * /recordings/{id}:
 *  delete:
 *    tags: [Recordings]
 *    summary: Delete a recording by ID
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the recording to delete
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
 router.delete('/:id', middleware.authenticateToken, async (req, res) => {
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
    await recording.destroy()
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})


module.exports = router