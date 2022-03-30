const Workout = require('../models/workout')
const User = require('../models/user')
const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const axios = require('axios')
const moment = require('moment')





/**
 * @swagger
 * 
 * /strava/activities:
 *  get:
 *    tags: [Strava]
 *    summary: Get all activities for strava athlete
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

router.get('/activities', middleware.authenticateToken, async (req, res) => {
  const actor = req.actor
  const page = req.query.page ?? 1
  const per_page = req.query.per_page ?? 30


  try {
    const headers = { headers: { 'Authorization': 'Bearer ' + actor.strava_token } }
    const activityResponse = await axios.get(`https://www.strava.com/api/v3/athlete/activities?per_page=${per_page}&page=${page}`, headers)
    const data = activityResponse.data
    const filteredData = []
    for (activity of data) {
      const id = activity.id.toString()
      const workout = await Workout.findOne({
        where: { source_id: id },
        attributes: { exclude: Workout.light() }
      })
      if (workout) {
        activity.workoutId = workout.id
      }
      filteredData.push(activity)
    }
    res.json(filteredData)
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: e.message })
  }
})


/**
 * @swagger
 * 
 * /strava/athlete:
 *  get:
 *    tags: [Strava]
 *    summary: Get strava athlete
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

router.get('/athlete', middleware.authenticateToken, async (req, res) => {
  const actor = req.actor
  try {
    const headers = { headers: { 'Authorization': 'Bearer ' + actor.strava_token } }
    const athleteResponse = await axios.get(`https://www.strava.com/api/v3/athlete`, headers)
    const data = athleteResponse.data
    res.json(data)
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: e.message })
  }
})

/**
 * @swagger
 * 
 * /strava/activity/{id}/import:
 *  post:
 *    tags: [Strava]
 *    summary: Import a new strava activity
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the strava activity
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

router.post('/activity/:id/import', middleware.authenticateToken, async (req, res) => {
  const id = req.params.id
  const actor = req.actor

  try {
    const headers = { headers: { 'Authorization': 'Bearer ' + actor.strava_token } }
    let name = null
    let duration = null
    let length = null
    let hrtss = null
    let tss = null
    let startDate = null
    let source_id = null
    let activity = null
    let description = null
    let zones = null
    let bests = null
    const activityResponse = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, headers)
    const streamResponse = await axios.get(`https://www.strava.com/api/v3/activities/${id}/streams?key_by_type=time&keys=heartrate,watts`, headers)
    const data = activityResponse.data

    //Assign values from response
    name = data.name
    description = data.description
    duration = Math.round(data.moving_time)
    source_id = data.id.toString()
    length = Math.round(data.distance)
    startDate = data.start_date
    activity = data.type?.toLowerCase()
    if (streamResponse.data) {
      streams = streamResponse.data
      zones = Workout.buildZoneDistribution(streamResponse.data?.watts?.data, streamResponse.data?.heartrate?.data, actor.hr_zones, actor.power_zones)
      bests = Workout.getBests(actor, streamResponse.data)
    }
    if (data.weighted_average_watts && actor.threshold_power) {
      tss = Math.round(((duration * (data.weighted_average_watts * (data.weighted_average_watts / actor.threshold_power)) / (actor.threshold_power * 3600))) * 100)
    }
    if (data.has_heartrate && streamResponse.data?.heartrate?.data) {
      hrtss = Workout.findHRTSS(actor, streamResponse.data.heartrate.data)
      hrtss = Math.round(hrtss * 100)
    }

    //Check if workout already exists in DB
    const workout = await Workout.findOne({
      where: {
        source_id: source_id
      },
      attributes: { exclude: Workout.light() }
    })
    if (workout) {
      return res.status(500).json({ message: 'Workout already exists!' })
    }

    // Create workout entry
    const newWorkout = await Workout.create({
      name: name,
      length: length,
      hr_effort: hrtss,
      effort: tss,
      description: description,
      source: 'strava',
      activity: activity,
      source_id: source_id,
      bests: bests,
      zones: zones,
      streams: streams,
      duration: duration,
      started_at: startDate,
      user_id: actor.id
    })

    // Update user bests if necessary
    try {
      const user = await User.findOne({
        where: {
          id: actor.id
        }
      })
      user.bests = actor.bests
      await user.save()
    } catch (e) { }
    res.json(newWorkout)
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: e.message })
  }
})


module.exports = router