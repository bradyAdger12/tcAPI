const Recording = require('../models/recording')
const User = require('../models/user')
const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const { sequelize } = require('../models/recording')
const polyline = require('@mapbox/polyline')
const axios = require('axios')

// Strava routes
router.get('/authorize', async (req, res) => {
  try {
    console.log(process.env.STRAVA_CLIENT_ID)
    const response = await axios.get(`https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=http://localhost:8080/strava/get_code&approval_prompt=auto&scope=activity:read`)
    res.send(response.data)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

router.get('/token', async (req, res) => {
  try {
    const response = await axios.post(`https://www.strava.com/oauth/token?client_id=${process.env.STRAVA_CLIENT_ID}&client_secret=${process.env.STRAVA_CLIENT_SECRET}&code=940bfe72dfae3fb1e0c12bf74d67994425415498&grant_type=authorization_code`)
    console.log(response.data)
  } catch (e) {
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
  const headers = { headers: { 'Authorization': 'Bearer ' + actor.strava_token } }
  try {
    let name = null
    let duration = null
    let length = null
    let hrtss = null
    let startDate = null
    let stoppedDate = null
    let source_id = null
    let activity = null
    const activityResponse = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, headers)
    const data = activityResponse.data

    //Assign values from response
    name = data.name
    duration = data.moving_time
    source_id = data.id.toString()
    length = Math.round(data.distance)
    startDate = new Date(data.start_date_local)
    stoppedDate = new Date(startDate.toString())
    activity = data.type?.toLowerCase()
    console.log(typeof source_id)
    stoppedDate.setSeconds(startDate.getSeconds() + duration)
    console.log(data)
    if (data.has_heartrate) {
      hrtss = await Recording.findHRTSS(actor, id, headers)
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
      hr_effort: hrtss * 100,
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