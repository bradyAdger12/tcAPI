const sequelize = require('../database.js')
const { Sequelize, Model } = require('sequelize');
const User = require('./user')
const axios = require('axios')
class Recording extends Model {
}

Recording.findHRTSS = async function (actor, id, headers) {
  try {
    const streamResponse = await axios.get(`https://www.strava.com/api/v3/activities/${id}/streams?key_by_type=time&keys=heartrate`, headers)
    const heartrate = streamResponse.data.heartrate.data
    let hrtss = null
    if (heartrate.length > 0) {
      hrtss = Recording.findHRTSS(actor, heartrate)
    }
    const k = actor.gender == 'male' ? 1.92 : 1.67
    const restinghr = actor.resting_hr
    const maxhr = actor.max_hr
    const thresholdhr = actor.threshold_hr
    if (restinghr && maxhr && thresholdhr) {
      let sum = 0
      heartrate.forEach((item, i) => {
        hrr = (item - restinghr) / (maxhr - restinghr)
        sum += (hrr * 0.64 * Math.exp(k * hrr))
      })
      const lthrr = (thresholdhr - restinghr) / (maxhr - restinghr)
      const trimpthresh = (lthrr * 0.64 * Math.exp(k * lthrr)) * 3600
      hrtss = Math.round((sum / trimpthresh) * 100) / 100
      return hrtss
    } else {
      return null;
    }
  } catch (e) {

  }
  return null;
}

Recording.formatRecording = function (user, actor) {
  // TODO
}

Recording.init({
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: Sequelize.STRING, allowNull: false },
  description: { type: Sequelize.STRING },
  length: { type: Sequelize.INTEGER, allowNull: false },
  activity: { type: Sequelize.STRING },
  duration: { type: Sequelize.INTEGER, allowNull: false },
  source: { type: Sequelize.STRING, allowNull: false },
  source_id: { type: Sequelize.STRING, allowNull: false },
  user_id: Sequelize.INTEGER,
  geom: { type: Sequelize.GEOMETRY("MultiLineString", 4326) },
  hr_effort: Sequelize.INTEGER,
  effort: Sequelize.INTEGER,
  started_at: Sequelize.DATE,
  stopped_at: Sequelize.DATE
}, {
  // Other model options go here
  sequelize, // We need to pass the connection instance
  modelName: 'recordings' // We need to choose the model name
});



module.exports = Recording