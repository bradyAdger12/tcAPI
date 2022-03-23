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
      where
    })
    const formattedWorkouts = []
    for (let workout of workouts) {
      formattedWorkouts.push(_.omit(workout.toJSON(), ['stats', 'createdAt', 'updatedAt', 'source', 'source_id', 'geom']))
    }
    res.json(formattedWorkouts)
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
router.get('/me/calendar', [middleware.authenticateToken, middleware.cache ], async (req, res) => {
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
    let workouts = await Workout.findAll({
      order: [
        // Will escape title and validate DESC against a list of valid direction parameters
        ['started_at', 'ASC']],
      where,
      attributes: { exclude: ['source', 'sourceId', 'stats', 'createdAt', 'updatedAt', 'geom'] }
    })

    const currentDate = moment(startsAt)
    const endDate = moment(endsAt)
    endDate.add(1, 'day')
    const dates = []
    let summary = {
      'effort': 0,
      'duration': 0,
      'distance': 0,
      'fitness': 0,
      'fatigue': 0,
      'form': 0
    }
    const summaries = []
    while (currentDate.format('D MMMM YYYY') != endDate.format('D MMMM YYYY')) {
      let filteredWorkouts = _.filter(workouts, (workout) => {
        return moment(workout.started_at).format('D MMMM YYYY') == currentDate.format('D MMMM YYYY')
      })
      for (const workout of filteredWorkouts) {
        if (workout.effort) {
          summary['effort'] += workout.effort
        } else if (workout.hr_effort) {
          summary['effort'] += workout.hr_effort
        }
        summary['duration'] += workout.duration
        summary['distance'] += workout.length
      }
      if (currentDate.day() == 0) {
        summary['fitness'] = await Workout.getTrainingLoad(currentDate)
        summary['fatigue'] = await Workout.getTrainingLoad(currentDate, 7)
        summary['form'] = Math.round(summary['fitness'] - summary['fatigue'])

        summaries.push(summary)
        summary = {
          'effort': 0,
          'duration': 0,
          'distance': 0,
          'fitness': 0,
          'fatigue': 0,
          'form': 0
        }
      }
      dates.push({
        date: currentDate.toISOString(),
        workouts: filteredWorkouts
      })

      currentDate.add(1, 'day')
    }
    let index = 7
    for (let summary of summaries) {
      dates.splice(index, 0, { summary })
      index += 7 + 1
    }
    if (!req.body.calendar_cached) {
      await cache.setEx(`calendar-${req.query.startsAt}${req.query.endsAt}`, 120, JSON.stringify({ dates }))
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
    const workout = await Workout.findOne({
      where: {
        id: id
      }
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