const Recording = require('../models/recording')
const User = require('../models/user')
const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const { sequelize } = require('../models/recording')
const polyline = require('@mapbox/polyline')
const axios = require('axios')

// Strava routes
/**
 * @swagger
 * 
 * /stava/authorize:
 *  post:
 *    tags: [Strava]
 *    summary: Authorize Strava account for use with out platform
 *    responses:
 *      '200':
 *          description: A successful response
 *      '401':
 *          description: Not authenticated
 *      default:
 *          description: Generic server error
 */
router.get('/authorize', async (req, res) => {
  try {
    // console.log(geojson)
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

router.get('/activity/:id', middleware.authenticateToken, async (req, res) => {
  const id = req.params.id
  const actor = req.actor
  const headers = { headers: { 'Authorization': 'Bearer ' + actor.strava_token } }
  try {
    let name = null
    let duration = null
    let length = null
    let startDate = null
    let stoppedDate = null
    let source_id = null
    const activityResponse = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, headers)
    const data = activityResponse.data
    name = data.name
    duration = data.moving_time
    source_id = data.id.toString()
    length = Math.round(data.distance)
    startDate = new Date(data.start_date)
    stoppedDate = new Date(startDate.toString())
    console.log(typeof source_id)
    stoppedDate.setUTCSeconds(startDate.getSeconds() + duration)
    const recording = await Recording.findOne({
      where: {
        source_id: source_id
      }
    })
    if (recording) {
      return res.status(500).json({ message: 'Recording already exists!' })
    }
    const hrtss = await Recording.findHRTSS(actor, id, headers)
    const newRecording = await Recording.create({
      name: name,
      length: length,
      hr_effort: hrtss * 100,
      source: 'strava',
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