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
 * /recordings/create:
 *  post:
 *    tags: [Recordings]
 *    summary: Create a new recoring
 *    requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/createRecording'
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
router.post('/create', middleware.authenticateToken, async (req, res) => {
  console.log(req.actor)
  const actor = req.actor
  const name = req.body.name
  const geometry = req.body.geom
  const source = req.body.source
  // const source_activity_id = req.body.source_activity_id
  try {
    // console.log(geojson)
    const response = await axios.get('https://www.strava.com/api/v3/activities/6829582940/streams?keys=heartrate,latlng&series_type=time', { headers: { 'Authorization': 'Bearer 96721f55aca96bffcf2ea3f6a3f265be83443eb1' } })
    const data = response.data
    let heartrate = data.find((element) => {
      return element.type == 'heartrate'
    })
    heartrate = heartrate.data
    hrr = []
    heartrate.forEach((value) => {
      hrr.push((value - 47) / (204 - 47))
    })
    console.log(hrr)
    // const hours
    // for (var i = 0; i < heartrate.length; i++) {
    //   sum += heartrate[i]
    //   if (i == 3600) break;
    // }



    console.log((sum / heartrate.length) / 174)

    // if (!name) throw Error('Name is required')
    // if (!geometry) throw Error('Geometry is required')
    // if (!source) throw Error('Source is required')
    // if (!source_activity_id) throw Error('Source Activity ID is required')
    // const recording = await Recording.create({
    //   name: name,
    //   geom: geometry,
    //   user_id: actor.id,
    //   source: source,
    //   source_activity_id: source_activity_id
    // })
    // return res.json(recording)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})


module.exports = router