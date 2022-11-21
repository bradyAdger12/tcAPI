const SavedWorkout = require('../models/savedworkout')
const express = require('express')
const router = express.Router()
const middleware = require('../middleware')

/**
 * @swagger
 * 
 * /saved_workouts/me:
 *  get:
 *    tags: [Workouts]
 *    summary: Get all me saved workouts
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
    const savedWorkouts = await SavedWorkout.findAll({
      userId: actorId,
      order: [['createdAt', 'DESC'],]
    })
    res.json(savedWorkouts)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

/**
 * @swagger
 * 
 * /create:
 *  post:
 *    tags: [Workouts]
 *    summary: Create a new saved workout
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
  try {
    const actorId = req.actor.id
    const tss = req.body.tss
    const hrTss = req.body.hrTss
    const name = req.body.name
    const description = req.body.description
    const activity = req.body.activity
    const workout = req.body.planned
    const savedWorkout = await SavedWorkout.create({
      userId: actorId,
      workout,
      tss,
      hrTss,
      name,
      description,
      activity
    })
    res.json(savedWorkout)
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

/**
 * @swagger
 * 
 * /workouts/{id}:
 *  delete:
 *    tags: [SavedWorkouts]
 *    summary: Delete a saved workout by ID
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
    const workout = await SavedWorkout.findOne({
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