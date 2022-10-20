const User = require('../models/user')
const Workout = require('../models/workout')
const express = require('express')
const router = express.Router()
const sequelize = require('../database.js')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const middleware = require('../middleware.js')
const moment = require('moment')
const _ = require('lodash')





// User routes
/**
 * @swagger
 * 
 * /users/me:
 *  get:
 *    tags: [Users]
 *    summary: Returns the authenticated user
 *    
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
  const actor = req.actor
  const user = await User.findOne({
    where: {
      id: actor.id
    }
  })
  if (actor) return res.json(User.formatUser(user))
})

/**
 * @swagger
 * 
 * /users/{id}:
 *  get:
 *    tags: [Users]
 *    summary: Returns a user by id
 *    parameters:
 *      - name: id
 *        in: path
 *        required: true
 *        description: ID of the user
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
  const id = req.params.id
  const actor = req.actor
  try {
    const user = await User.findOne({ where: { id: id } })
    if (user) {
      return res.json(User.formatUser(user, actor))
    }
    return res.status(404).json({ message: 'User not found.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * 
 * /users/me/training_load:
 *  get:
 *    tags: [Users]
 *    summary: Returns a user by id
 *    parameters:
 *      - name: date
 *        in: path
 *        required: true
 *        description: Date to get the training load from
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
router.get('/me/training_load', middleware.authenticateToken, async (req, res) => {
  const date = req.query.date
  const trainingLoad = {}
  try {
    trainingLoad['fitness'] = await Workout.getTrainingLoad(req.actor, moment(date).endOf('day'))
    trainingLoad['fatigue'] = await Workout.getTrainingLoad(req.actor, moment(date).endOf('day'), 7)
    const yesterdayFitness = await Workout.getTrainingLoad(req.actor, moment(date).subtract(1, 'days').endOf('day'))
    const yesterdayFatigue = await Workout.getTrainingLoad(req.actor, moment(date).subtract(1, 'days').endOf('day'), 7)
    trainingLoad['form'] = Math.round(yesterdayFitness - yesterdayFatigue)
    res.json(trainingLoad)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * 
 * /users/update/me:
 *  put:
 *    tags: [Users]
 *    summary: Update authenticated users fields
 *    requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/fullUser'
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
router.put('/update/me', middleware.authenticateToken, async (req, res) => {
  let actor = req.actor
  try {
    let user = await User.findOne({ where: { id: actor.id } })
    if (user) {
      if (_.has(req.body, 'display_name')) {
        user.display_name = req.body.display_name
      }
      if (_.has(req.body, 'hr_zones')) {
        user.hr_zones = req.body.hr_zones
      }
      if (_.has(req.body, 'power_zones')) {
        user.power_zones = req.body.power_zones
      }
      if (_.has(req.body, 'max_hr')) {
        user.max_hr = req.body.max_hr
      }
      if (_.has(req.body, 'gender')) {
        user.gender = req.body.gender
      }
      if (_.has(req.body, 'resting_hr')) {
        user.resting_hr = req.body.resting_hr
      }
      if (_.has(req.body, 'running_threshold_pace')) {
        user.running_threshold_pace = req.body.running_threshold_pace
      }
      if (_.has(req.body, 'threshold_hr')) {
        user.threshold_hr = req.body.threshold_hr && req.body.threshold_hr != '' ? req.body.threshold_hr : null
        user.hr_zones = User.getHeartRateZones(user.threshold_hr)
      }
      if (_.has(req.body, 'threshold_power')) {
        user.threshold_power = req.body.threshold_power && req.body.threshold_power != '' ? req.body.threshold_power : null
        user.power_zones = User.getPowerZones(user.threshold_power)
      }
      if (_.has(req.body, 'strava_token')) {
        user.strava_token = req.body.strava_token
      }
      if (_.has(req.body, 'garmin_token')) {
        user.garmin_token = req.body.garmin_token
      }
      if (_.has(req.body, 'strava_enable_auto_sync')) {
        user.strava_enable_auto_sync = req.body.strava_enable_auto_sync
      }
      if (_.has(req.body, 'garmin_enable_auto_sync')) {
        user.garmin_enable_auto_sync = req.body.garmin_enable_auto_sync
      }
      console.log(user)
      const updatedUser = await user.save()
      return res.json(User.formatUser(updatedUser))
    }
    throw Error('User does not exist')
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * 
 * /users/delete/me:
 *  delete:
 *    tags: [Users]
 *    summary: Delete authenticated user
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
router.delete('/delete/me', middleware.authenticateToken, async (req, res) => {
  const actor = req.actor
  try {
    const user = await User.findOne({ where: { id: actor.id } })
    if (user) {
      await user.destroy()
      return res.json({ success: true })
    }
    throw Error('User does not exist')
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})


/**
 * @swagger
 * 
 * /users/login:
 *  post:
 *    tags: [Users]
 *    summary: Login
 *    requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/login'
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
router.post('/login', async (req, res) => {
  const email = req.body.email
  const password = req.body.password
  try {
    if (!email) {
      throw Error('Email is required.')
    } else if (!password) {
      throw Error('Password is required.')
    }
    let user = await User.findOne({ where: { email: email } })
    if (!user) {
      return res.status(404).json({ message: 'Email or password is incorrect.' })
    }
    if (await bcrypt.compare(password, user.password)) {
      user = user.get({ plain: true })
      const accessToken = jwt.sign(user, process.env.JWT_SECRET_KEY)
      user.token = accessToken
      return res.json(User.formatUser(user))
    }
    return res.status(404).json({ message: 'Email or password is incorrect.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

/**
 * @swagger
 * 
 * /users/register:
 *  post:
 *    tags: [Users]
 *    summary: Register a new user
 *    requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/register'
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
router.post('/register', async (req, res) => {
  const email = req.body.email
  const rawPassword = req.body.password
  const name = req.body.display_name

  try {

    //Throw error if field are not present
    if (!email) {
      throw Error('Email is required.')
    } else if (!rawPassword) {
      throw Error('Password is required.')
    } else if (!name) {
      throw Error('Display Name is required.')
    }

    const password = await bcrypt.hash(rawPassword, 10)
    //Throw if email exists in db
    const emailExists = await User.findOne({ where: { email: email } });
    if (emailExists) {
      throw Error("Email already registered")
    }
    req.body.password = password
    if (req.body.threshold_hr) {
      req.body.hr_zones = User.getHeartRateZones(req.body.threshold_hr)
    }
    if (req.body.threshold_power) {
      req.body.power_zones = User.getPowerZones(req.body.threshold_power)
    }
    req.body.bests = {
      'heartrate': {
        '1hr': 0,
        '20min': 0,
        '10min': 0,
        '5min': 0,
        'max': 0
      },
      'watts': {
        '1hr': 0,
        '20min': 0,
        '10min': 0,
        '5min': 0,
        '2min': 0,
        '1min': 0,
        '30sec': 0,
        '5sec': 0,
        'max': 0
      }
    }
    const result = await User.create(
      req.body
    );
    res.json(User.formatUser(result));
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})


module.exports = router