var Sequelize = require('sequelize');
var sequelize = new Sequelize(process.env.PGDATABASE, process.env.PGUSER, process.env.PGPASSWORD, {
  host: process.env.PGHOST,
  dialect: 'postgres',
  logging: false,
  timezone: '+07:00',
  dialectOptions: {
    useUTC: false, // --> Add this line. for reading from database
    ssl: process.env.PGDATABASE !== 'cycling_log_dev',
    native: true
  },
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