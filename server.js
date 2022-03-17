require('dotenv').config()
const express = require('express')
const app = express()
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const schemas = require('./swagger/schemas.js')
const sequelize = require('./database')
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.1",
    info: {
      title: 'Training Club API',
      description: 'Training Club description',
    },
    servers: [
      {
        url: 'http://localhost:8080'
      }
    ],
    components: {
      schemas: schemas,
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          in: "header",
          bearerFormat: "JWT"
        },
      }
    },
    security: [{
      bearerAuth: []
    }],
  },
  swagger: "3.0",
  apis: ["./controllers/*.js"]
} 

const swaggerDocs = swaggerJsDoc(swaggerOptions)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/users', require('./controllers/users_controller'))
app.use('/recordings', require('./controllers/recordings_controller'))
app.use('/strava', require('./controllers/strava_controller'))

const port = process.env.PORT || 8080
app.listen(port, async (req, res) => {
  await sequelize.sync()
  console.log(`Server listening on port ${port}`)
})