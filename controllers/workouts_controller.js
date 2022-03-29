const Workout = require('../models/workout')
const User = require('../models/user')
const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const data = require('../stream_data.js')
const _ = require('lodash')
const { Op } = require('sequelize')
const moment = require('moment')
const cache = require('../cache.js')
const getSummary = require('../tools/summary.js')

// Workouts routes



/**
 * @swagger
 * 
 * /workouts/stats/test:
 *  get:
 *    tags: [Workouts]
 *    summary: Test workout stream data
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
    const stats = Workout.getStats(data, hrZones, powerZones)
    res.json(stats)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

/**
 * @swagger
 * 
 * /workouts/create/planned:
 *  get:
 *    tags: [Workouts]
 *    summary: Create a future workout
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
router.post('/create/planned', middleware.authenticateToken, async (req, res) => {
  try {
    console.log(req.body)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

/**
 * @swagger
 * 
 * /workouts/weekly_summary:
 *  get:
 *    tags: [Workouts]
 *    summary: Get training load for a specified week
 *    parameters:
 *      - name: date
 *        in: path
 *        required: false
 *        description: startDate filter
 *        schema:
 *           type: Date
 *      - name: endDate
 *        in: path
 *        required: false
 *        description: startDate filter
 *        schema:
 *           type: endDate
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
router.get('/weekly_summary', middleware.authenticateToken, async (req, res) => {
  try {
    const startDate = req.query.startDate
    const endDate = req.query.endDate
    if (!startDate || !endDate) {
      throw Error('startDate and endDate are required')
    }
    summary = await getSummary(moment(startDate).startOf('day'), moment(endDate).endOf('day'))
    res.json({ summary })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

/**
 * @swagger
 * 
 * /workouts/me:
 *  get:
 *    tags: [Workouts]
 *    summary: Get all workouts for authenticated user
 *    parameters:
 *      - name: startDate
 *        in: path
 *        required: false
 *        description: startDate filter
 *        schema:
 *           type: Date
 *      - name: endDate
 *        in: path
 *        required: false
 *        description: startDate filter
 *        schema:
 *           type: endDate
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
    const startsAt = req.query.startsAt
    const endsAt = req.query.endsAt
    const actorId = req.actor.id
    const where = {
      user_id: actorId
    }
    if (startsAt && endsAt) {
      where[
        "started_at"] = {
        [Op.and]: {
          [Op.gte]: startsAt,
          [Op.lte]: endsAt
        }
      }
    }
    const workouts = await Workout.findAll({
      order: [
        // Will escape title and validate DESC against a list of valid direction parameters
        ['started_at', 'DESC']],
      where,
      attributes: { exclude: Workout.light() }
    })
    res.json(workouts)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

/**
 * @swagger
 * 
 * /workouts/me/calendar:
 *  get:
 *    tags: [Workouts]
 *    summary: Get all workouts for authenticated user
 *    parameters:
 *      - name: startDate
 *        in: path
 *        required: false
 *        description: startDate filter
 *        schema:
 *           type: Date
 *      - name: endDate
 *        in: path
 *        required: false
 *        description: startDate filter
 *        schema:
 *           type: endDate
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
router.get('/me/calendar', [middleware.authenticateToken], async (req, res) => {
  try {
    let startsAt = req.query.startsAt
    let endsAt = req.query.endsAt
    if (startsAt) {
      startsAt = moment(startsAt).startOf('day').toISOString()
    }
    if (endsAt) {
      endsAt = moment(endsAt).endOf('day').toISOString()
    }
    const actorId = req.actor.id
    const where = {
      user_id: actorId
    }
    if (startsAt && endsAt) {
      where[
        "started_at"] = {
        [Op.and]: {
          [Op.gte]: startsAt,
          [Op.lte]: endsAt
        }
      }
    }
    let workouts = await Workout.findAll({
      order: [
        ['started_at', 'DESC']],
      where,
      attributes: { exclude: Workout.light() }
    })

    const currentDate = moment(startsAt)
    const endDate = moment(endsAt).add(1, 'days')
    const dates = []
    let summary = null
    while (currentDate.format('D MMMM YYYY') != endDate.format('D MMMM YYYY')) {
      let filteredWorkouts = _.filter(workouts, (workout) => {
        return moment(workout.started_at).format('D MMMM YYYY') == currentDate.format('D MMMM YYYY')
      })
      dates.push({
        date: currentDate.toISOString(),
        workouts: filteredWorkouts
      })

      if (currentDate.day() == 1) {
        let summaryStart = moment(currentDate.toISOString()).startOf('day')
        let summaryEnd = moment(currentDate.toISOString()).add(6, 'days').endOf('day')
        summary = await getSummary(summaryStart, summaryEnd)
      } else if (currentDate.day() == 0) {
        dates.push({ summary })
      }

      currentDate.add(1, 'days')
    }
    res.json({ dates })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})


/**
 * @swagger
 * 
 * /workouts/{id}:
 *  get:
 *    tags: [Workouts]
 *    summary: Get a workout by ID
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the workout
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
    const light = req.query.light
    const workout = await Workout.findOne({
      where: {
        id: id
      },
      attributes: { exclude: light ? Workout.light() : [] }
    })
    if (!workout) {
      return res.status(404).json({ message: 'Workout could not be found.' })
    }
    res.json(workout)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

/**
 * @swagger
 * 
 * /workouts/{id}:
 *  put:
 *    tags: [Workouts]
 *    summary: Update a workout by ID
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the workout
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
router.put('/:id', middleware.authenticateToken, async (req, res) => {
  try {
    const id = req.params.id
    const light = req.query.light
    let workout = await Workout.findOne({
      where: {
        id: id
      },
      attributes: { exclude: light ? Workout.light() : [] }
    })
    if (!workout) {
      return res.status(404).json({ message: 'Workout could not be found.' })
    }
    if (_.has(req.body, 'started_at')) {
      workout.started_at = req.body.started_at
    }
    await workout.save()
    res.json(workout)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

/**
 * @swagger
 * 
 * /workouts/me/stats:
 *  get:
 *    tags: [Workouts]
 *    summary: Get stats for a workout. By default, this is a weekly total
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
    const starts_at = moment().set({ 'year': today.year(), 'month': today.month(), 'date': 1, 'hour': 0, 'minute': 0, 'second': 0, 'millisecond': 0 });
    const ends_at = moment().set({ 'year': today.year(), 'month': today.month(), 'date': today.daysInMonth(), 'hour': 23, 'minute': 59, 'second': 59, 'millisecond': 59 });
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
    const workouts = await Workout.findAll({
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
    const numWorkouts = workouts.length
    for (let workout of workouts) {
      const workoutZones = workout.stats.zones
      for (let zone in workoutZones) {
        if (typeof workoutZones[zone] == 'object') {
          zones[zone]['hr-seconds'] += workoutZones[zone]['hr-seconds']
          zones[zone]['hr-percentage'] += workoutZones[zone]['hr-percentage']
          zones[zone]['watt-seconds'] += workoutZones[zone]['watt-seconds']
          zones[zone]['watt-percentage'] += workoutZones[zone]['watt-percentage']
        }
      }
      if (workout.effort) {
        effort += workout.effort
      }
      else if (workout.hr_effort) {
        effort += workout.hr_effort
      }
      if (workout.length) {
        length += workout.length
      }
      if (workout.duration) {
        duration += workout.duration
      }

    }
    res.json({ numWorkouts, effort, duration, length, starts_at, ends_at, zones })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

/**
 * @swagger
 * 
 * /workouts/{id}:
 *  delete:
 *    tags: [Workouts]
 *    summary: Delete a workout by ID
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the workout to delete
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
    const workout = await Workout.findOne({
      where: {
        id: id
      }
    })
    if (!workout) {
      return res.status(404).json({ message: 'Workout could not be found.' })
    }
    await workout.destroy()
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})


module.exports = router