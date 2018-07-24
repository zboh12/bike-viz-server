const express = require('express')
const http = require('http')
const bodyParser = require('body-parser')
const cors = require('cors')

const port = process.env.PORT || 5001
const app = express()

app.use(cors())
app.use(bodyParser.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({limit: '50mb'}))

const server = app.listen(port, () => console.log(`Listening on port ${port}`))

// const server = new http.Server(app)
const io = require('socket.io').listen(server)

app.get('/', (req, res) => {
  res.send({ express: 'Hello From Express' })
})

app.use('/stations', require('./stations'))
app.use('/trips', require('./trips'))
app.use('/directions', require('./directions'))

// sockets
io.on('connection', (socket) => {
  socket.on('setTimeInterval', (timeInterval) => {
    console.log(timeInterval)
    console.log('fetch data')
    io.emit('fetchData', timeInterval)
  })

  socket.on('showTrip', trip => {
    io.emit('clientShowTrip', trip)
  })

  socket.on('tripsLoaded', (numTrips) => {
    console.log('num trips: ' + numTrips)
    io.emit('tripsLoaded', numTrips)
  })

  socket.on('startAnimation', (time) => {
    console.log('start animation')
    io.emit('startAnimation', time)
  })

  socket.on('updateDashboard', (timeInterval) => {
    console.log('update dashboard')
    io.emit('updateDashboard', timeInterval)
  })

  socket.on('setTime', (newTime) => {
    socket.broadcast.emit('setTime', newTime)
  })

  socket.on('setStartTime', (startTime) => {
    socket.broadcast.emit('setStartTime', startTime)
  })

  socket.on('stopAnimation', (time) => {
    console.log('stop animation')
    socket.broadcast.emit('stopAnimation', time)
  })

  socket.on('setControlTime', (time) => {
    socket.broadcast.emit('setControlTime', time)
  })

  socket.on('resetMap', () => {
    console.log('reset map')
    socket.broadcast.emit('resetMap')
  })
})

