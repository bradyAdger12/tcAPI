var Sequelize = require('sequelize');
var sequelize = new Sequelize('cycling_log_dev', 'postgres', 'postgres', {
  host: '192.168.1.5',
  dialect: 'postgres',
  dialectOptions: {
    useUTC: false
  },
  timezone: '+06:00'
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });


module.exports = sequelize