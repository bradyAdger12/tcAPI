const schemas = {

  //User
  notMeUser: {
    "properties": {
      "id": {
        "type": "integer"
      },
      "display_name": {
        "type": "string"
      }
    }
  },
  login: {
    "properties": {
      "email": {
        "type": "string",
        "default": ""
      },
      "password": {
        "type": "string",
        "default": ""
      }
    }
  },
  register: {
    "properties": {
      "email": {
        "type": "string",
        "default": ""
      },
      "password": {
        "type": "string",
        "default": ""
      },
      "gender": {
        "type": "string",
        "default": ""
      },
      "display_name": {
        "type": "string",
        "default": ""
      },
      "hr_zones": {
        "type": "array",
        "default": "[]",
        "items": {
          "type": "integer"
        }
      },
      "power_zones": {
        "type": "array",
        "default": "[]",
        "items": {
          "type": "integer"
        }
      },
      "resting_hr": {
        "type": "integer",
        "default": "null"
      },
      "max_hr": {
        "type": "integer",
        "default": "null"
      },
      "threshold_hr": {
        "type": "integer",
        "default": "null"
      },
      "threshold_power": {
        "type": "integer",
        "default": "null"
      },
      "strava_token": {
        "type": "string",
        "default": "null"
      },
      "garmin_token": {
        "type": "string",
        "default": "null"
      },
      "strava_enable_auto_sync": {
        "type": "boolean",
        "default": "false"
      },
      "garmin_enable_auto_sync": {
        "type": "boolean",
        "default": "false"
      },
    }
  },
  fullUser: {
    "properties": {
      "display_name": {
        "type": "string",
        "default": ""
      },
      "gender": {
        "type": "string",
        "default": ""
      },
      "hr_zones": {
        "type": "array",
        "default": "[]",
        "items": {
          "type": "integer"
        }
      },
      "power_zones": {
        "type": "array",
        "default": "[]",
        "items": {
          "type": "integer"
        }
      },
      "max_hr": {
        "type": "integer",
        "default": "null"
      },
      "max_hr": {
        "type": "integer",
        "default": "null"
      },
      "threshold_hr": {
        "type": "integer",
        "default": "null"
      },
      "threshold_power": {
        "type": "integer",
        "default": "null"
      },
      "strava_token": {
        "type": "string",
        "default": "null"
      },
      "garmin_token": {
        "type": "string",
        "default": "null"
      },
      "strava_enable_auto_sync": {
        "type": "boolean",
        "default": "false"
      },
      "garmin_enable_auto_sync": {
        "type": "boolean",
        "default": "false"
      },
    }
  },

  //Recording
  createRecording: {
    "properties": {
      "name": {
        "type": "string",
        "default": ""
      },
      "length": {
        "type": "integer",
        "default": "null"
      },
      "hr_effort": {
        "type": "integer",
        "default": "null"
      },
      "source": {
        "type": "string",
        "default": "null"
      },
      "source_id": {
        "type": "string",
        "default": "null"
      },
      "duration": {
        "type": "integer",
        "default": "null"
      },
      "started_at": {
        "type": "date",
        "default": "null"
      },
      "stopped_at": {
        "type": "date",
        "default": "null"
      }
    }
  },
}

module.exports = schemas