const Recording = require('../models/recording')
const User = require('../models/user')
const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const data = require('../stream_data.js')
const { Op } = require('sequelize')
const moment = require('moment')

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
 * /recordings/me/stats:
 *  get:
 *    tags: [Recordings]
 *    summary: Get stats for a recording. By default, this is a weekly total
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
router.get('/me/stats', middleware.authenticateToken, async (req, res) => {
  try {
    const actor = req.actor
    const today = moment()
    const starts_at = moment().set({ 'year': today.year(), 'month': today.month(), 'date': today.date() - (today.day() - 1), 'hour': 0, 'minute': 0, 'second': 0, 'millisecond': 0 });
    const ends_at = moment().set({ 'year': today.year(), 'month': today.month(), 'date': today.date() + (7 - today.day()), 'hour': 23, 'minute': 59, 'second': 59, 'millisecond': 59 });
    starts_at.subtract(7, 'days')
    ends_at.subtract(7, 'days')
    let effort = 0
    let duration = 0
    let length = 0
    const zones = {
      'Recovery': {
        'hr-percentage': 0,
        'watt-percentage': 0,
        'hr-seconds': 0,
        'watt-seconds': 0
      },
      'Endurance': {
        'hr-percentage': 0,
        'watt-percentage': 0,
        'hr-seconds': 0,
        'watt-seconds': 0
      },
      'Tempo': {
        'hr-percentage': 0,
        'watt-percentage': 0,
        'hr-seconds': 0,
        'watt-seconds': 0
      },
      'Threshold': {
        'hr-percentage': 0,
        'watt-percentage': 0,
        'hr-seconds': 0,
        'watt-seconds': 0
      },
      'VO2 Max': {
        'hr-percentage': 0,
        'watt-percentage': 0,
        'hr-seconds': 0,
        'watt-seconds': 0
      },
      'Anaerobic': {
        'watt-percentage': 0,
        'watt-seconds': 0
      },
    }
    const recordings = await Recording.findAll({
      where: {
        user_id: actor.id,
        "started_at": {
          [Op.and]: {
            [Op.gte]: starts_at,
            [Op.lte]: ends_at
          }
        }
      }
    })
    const numRecordings = recordings.length
    for (let recording of recordings) {
      const recordingZones = recording.stats.zones
      for (let zone in recordingZones) {
        if (typeof recordingZones[zone] == 'object') {
          zones[zone]['hr-seconds'] += recordingZones[zone]['hr-seconds']
          zones[zone]['hr-percentage'] += recordingZones[zone]['hr-percentage']
          zones[zone]['watt-seconds'] += recordingZones[zone]['watt-seconds']
          zones[zone]['watt-percentage'] += recordingZones[zone]['watt-percentage']
        }
      }
      if (recording.effort) {
        effort += recording.effort
      }
      else if (recording.hr_effort) {
        effort += recording.hr_effort
      }
      if (recording.length) {
        length += recording.length
      }
      if (recording.duration) {
        duration += recording.duration
      }

    }
    res.json({ numRecordings, effort, duration, length, starts_at, ends_at, zones })
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