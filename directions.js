const express = require('express')
const router = express.Router()
const polyline = require('polyline')
const { Pool } = require('pg')

//@todo: put key in more private location
const apiKey = 'AIzaSyASmnqxo4m6RPnpXZavgd8kBetwJC7vkbc' 
//'AIzaSyCYu9OjjKPyoVSmbNRrT5-PxJUNlNp2LyI'
const googleMapsClient = require('@google/maps').createClient({
  key: apiKey,
  Promise: Promise
})

const pool = new Pool({
  user: 'bike',
  host: 'bike-viz-db.csljqqnmb0jn.us-east-1.rds.amazonaws.com',
  database: 'postgres',
  password: 'bikeviz12', //@todo: put this somewhere more private
  port: 5432,
  max: 10
})

const getDirectionsInTable = async (client, start, end) => {
  return client.query('SELECT polyline, distance FROM hubway.directions WHERE ss_id = $1 and es_id = $2', [start, end])
    .then(pgres => {
      if (pgres.rows) {
        return pgres.rows[0]
      } else {
        return false
      }
    })
    .catch(e => {
      console.log(e.stack)
      return false
    })
}

const insertPolylineInTable = function (client, start, end, polyline, totalDistance) {
  return client.query({
    text: 'INSERT INTO hubway.directions (ss_id, es_id, polyline, distance) VALUES ($1, $2, $3, $4) RETURNING ss_id',
    values: [start, end, polyline, totalDistance]
  })
    .then(pgres => {
      return true
    })
    .catch(e => {
      console.log(e.stack)
      return false
    })
}

const fetchDirections = async (startLoc, endLoc) => {
  return googleMapsClient.directions(
    {
      origin: startLoc,
      destination: endLoc,
      mode: 'bicycling'
    },
  ).asPromise()
    .then((response) => {
      if (!response.json.routes || !response.json.routes[0]) {
        return false
      }
      const legs = response.json.routes[0].legs
      let totalDistance = 0
      legs.forEach(leg => {
        totalDistance += leg['distance']['value']
      })
      const polylineRoute = response.json.routes[0].overview_polyline.points
      return {'polylineRoute': polylineRoute, 'distance': totalDistance}
    })
    .catch((err) => {
      console.log(err.stack)
      return null
    })
}

const getPotentialTrips = async (client, startStations, endStations) => {
  return client.query(
    'SELECT polyline, distance, ss_id, es_id FROM hubway.directions WHERE ss_id = ANY($1) AND es_id = ANY($2)',
    [startStations, endStations])
    .then(pgres => {
      if (pgres.rows) {
        return pgres.rows
      } else {
        return []
      }
    })
    .catch(e => {
      console.log(e.stack)
      return []
    })
}

const getNewTrip = async (client, newTrip) => {
  const directionObject = await fetchDirections(
    newTrip['ss_lat'] + ',' + newTrip['ss_lon'],
    newTrip['es_lat'] + ',' + newTrip['es_lon']
  )
  if (!directionObject) {
    return false
  } else {
    insertPolylineInTable(
      client,
      newTrip['ss_id'], newTrip['es_id'],
      directionObject['polylineRoute'], directionObject['distance']
    )
  }
  let decodedPoints = polyline.decode(directionObject['polylineRoute'])
  let distance = directionObject['distance']
  return Object.assign({}, newTrip, {'segments': decodedPoints, 'distance': distance})
}

router.post('/all', (req, res) => {
  let trips = req.body.trips
  let startStationIds = req.body.startStationIds.map(id => parseInt(id))
  let endStationIds = req.body.endStationIds.map(id => parseInt(id))

  pool.connect().then(client => {
    getPotentialTrips(client, startStationIds, endStationIds).then(ssTrips => {
      console.log('already in table: ' + ssTrips.length)
      let stationsDict = {}
      ssTrips.forEach(t => {
        if (!(t['ss_id'] in stationsDict)) {
          stationsDict[t['ss_id']] = {}
        }
        if (!(t['es_id'] in stationsDict[t['ss_id']])) {
          stationsDict[t['ss_id']][t['es_id']] = {
            'segments': polyline.decode(t['polyline']),
            'distance': t['distance']
          }
        }
      })
      let directions = []
      let newTrips = []
      trips.forEach(trip => {
        let esDict = stationsDict[trip['ss_id']]
        if (esDict) {
          if (trip['es_id'] in esDict) {
            directions.push(Object.assign({},
              trip,
              esDict[trip['es_id']]
            ))
          } else {
            console.log(trip)
            newTrips.push(trip)
          }
        }
      })
      res.json(directions)
    })
  }).catch(e => {
    console.log(e.stack)
    res.json(false)
  })
})

module.exports = router
