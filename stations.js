const express = require('express')
const router = express.Router()
const { Pool } = require('pg')

const pool = new Pool({
  user: 'bike',
  host: 'bike-viz-db.csljqqnmb0jn.us-east-1.rds.amazonaws.com',
  database: 'postgres',
  password: 'bikeviz12', //@todo: put this somewhere more private
  port: 5432
})

// return a list of all stations
router.get('/', (req, res) => {
  // checkout a client
  pool.connect()
    .then(client => {
      client.query('SELECT * FROM hubway.stationinfo')
        .then(pgres => {
          client.release()
          res.json(pgres.rows)
        })
        .catch(e => {
          client.release()
          console.log(e.stack)
        })
    })
})

// return a list of the statuses of all stations at the beginning of a given date
router.get('/statuses/:index', (req, res) => {
  let index = parseInt(req.params.index)
  pool.connect()
    .then(client => {
      client.query('SELECT * FROM hubway.stationstatus WHERE index = $1', [index])
        .then(pgres => {
          client.release()
          res.json(pgres.rows[0]['status'])
        })
        .catch(e => {
          client.release()
          console.log(e.stack)
        })
    })
})

module.exports = router
