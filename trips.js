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


// return a list of the trips between two timestamps
router.get('/', (req, res) => {
  let start = new Date (parseInt(req.query.start))
  let end = new Date (parseInt(req.query.end))
  pool.connect()
    .then(client => {
      client.query(
        'SELECT * FROM hubway.alltrips WHERE starttime BETWEEN $1 and $2 ORDER BY starttime',
        [start, end]
      )
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

module.exports = router
