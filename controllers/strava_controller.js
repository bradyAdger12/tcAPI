const Recording = require('../models/recording')
const User = require('../models/user')
const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const { sequelize } = require('../models/recording')
const polyline = require('@mapbox/polyline')
const axios = require('axios')





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


  try {
    const headers = { headers: { 'Authorization': 'Bearer ' + actor.strava_token } }
    const activityResponse = await axios.get(`https://www.strava.com/api/v3/athlete/activities`, headers)
    const data = activityResponse.data
    const filteredData = []
    for (activity of data) {
      const id = activity.id.toString()
      const recording = await Recording.findOne({
        where: { source_id: id }
      })
      if (recording) {
        activity.isImported = true
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
 * /strava/activities:
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
    let stoppedDate = null
    let source_id = null
    let activity = null
    const activityResponse = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, headers)
    const data = activityResponse.data

    //Assign values from response
    name = data.name
    duration = Math.round(data.moving_time)
    source_id = data.id.toString()
    length = Math.round(data.distance)
    startDate = new Date(data.start_date_local)
    stoppedDate = new Date(startDate.toString())
    activity = data.type?.toLowerCase()
    stoppedDate.setSeconds(startDate.getSeconds() + duration)
    if (data.weighted_average_watts && user.threshold_power) {
      tss = Math.round(((duration * (data.weighted_average_watts * (data.weighted_average_watts / user.threshold_power)) / (user.threshold_power * 3600))) * 100)
    }
    if (data.has_heartrate) {
      hrtss = await Recording.findHRTSS(actor, id, headers)
      hrtss = Math.round(hrtss * 100)
    }

    //Check if recording already exists in DB
    const recording = await Recording.findOne({
      where: {
        source_id: source_id
      }
    })
    if (recording) {
      return res.status(500).json({ message: 'Recording already exists!' })
    }
    // res.send()

    // Create recording entry
    const newRecording = await Recording.create({
      name: name,
      length: length,
      hr_effort: hrtss,
      effort: tss,
      source: 'strava',
      activity: activity,
      source_id: source_id,
      duration: duration,
      started_at: startDate,
      stopped_at: stoppedDate,
      user_id: actor.id
    })
    res.json(newRecording)
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: e.message })
  }
})


module.exports = router