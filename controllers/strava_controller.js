const Workout = require('../models/workout')
const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const axios = require('axios')
const interpolateArray = require('../tools/interpolation.js')
const User = require('../models/user')





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
 * /strava/webhook:
 *  post:
 *    tags: [Strava]
 *    summary: Create or Update imported strava activities
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

router.post('/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  if (req.body) {
    try {
      const type = req.body.aspect_type
      const activity_id = req.body.object_id?.toString()
      const updates = req.body.updates
      const owner_id = req.body.owner_id

      // Find user
      const user = await User.findOne({
        where: {
          strava_owner_id: owner_id
        }
      })

      if (user.strava_enable_auto_sync) {

        // Update existing entry
        if (type === 'update') {
          const workout = await Workout.findOne({
            where: {
              source_id: activity_id
            },
            attributes: { exclude: Workout.light() }
          })
          if (workout) {
            for (const key of Object.keys(updates)) {
              console.log(key)
              if (key === 'title') {
                workout.name = updates[key]
              } else if (key === 'description') {
                workout.description = updates[key]
              }
            }
            await workout.save()
          }

          // Create new entry
        } else if (type === 'create') {
          if (user) {
            const actor = user
            try {
              const headers = { headers: { 'Authorization': 'Bearer ' + actor.strava_token } }
              let name = null
              let duration = null
              let length = null
              let started_at = null
              let source_id = null
              let source = null
              let activity = null
              let streams = null
              let normalizedPower = null
              let description = null
              let streamResponse = null
              const activityResponse = await axios.get(`https://www.strava.com/api/v3/activities/${activity_id}`, headers)
              try {
                streamResponse = await axios.get(`https://www.strava.com/api/v3/activities/${activity_id}/streams?key_by_type=true&keys=heartrate,watts,distance&series_type=time`, headers)
              } catch (e) { }
              const data = activityResponse.data

              //Assign values from response
              name = data.name
              description = data.description
              source = 'strava'
              duration = Math.round(data.moving_time)
              source_id = data.id.toString()
              length = Math.round(data.distance)
              started_at = data.start_date
              streams = streamResponse?.data
              normalizedPower = data.weighted_average_watts
              activity = data.type?.toLowerCase()

              await Workout.createWorkout({ actor, name, description, duration, length, source, source_id, started_at, streams, activity, normalizedPower })
            } catch (e) {
              console.log(e)
            }
          }
        }
      }
    } catch (e) {
      console.log(e)
    }
  }
})

/**
 * @swagger
 * 
 * /strava/webhook:
 *  get:
 *    tags: [Strava]
 *    summary: Get something
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

router.get('/webhook', async (req, res) => {
  // Your verify token. Should be a random string.
  const VERIFY_TOKEN = "STRAVA";
  // Parses the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Verifies that the mode and token sent are valid
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.json({ "hub.challenge": challenge });
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
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
    let started_at = null
    let source_id = null
    let source = null
    let activity = null
    let streams = null
    let normalizedPower = null
    let description = null
    const activityResponse = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, headers)
    const streamResponse = await axios.get(`https://www.strava.com/api/v3/activities/${id}/streams?key_by_type=true&keys=heartrate,watts,distance&series_type=time`, headers)
    const data = activityResponse.data

    //Assign values from response
    name = data.name
    description = data.description
    source = 'strava'
    duration = Math.round(data.moving_time)
    source_id = data.id.toString()
    length = Math.round(data.distance)
    started_at = data.start_date
    streams = streamResponse.data
    normalizedPower = data.weighted_average_watts
    activity = data.type?.toLowerCase()

    const newWorkout = await Workout.createWorkout({ actor, name, description, duration, length, source, source_id, started_at, streams, activity, normalizedPower })
    res.json(newWorkout)
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: e.message })
  }
})


module.exports = router