
const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()

app.use(express.json())

const dbPath = path.join(__dirname, 'gamezone.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()




app.get('/consoles', async (request, response) => {
  const {platform, sort, order} = request.query

  const allowedFields = ['console_id', 'name', 'platform', 'price_per_hour']
  const sortField = sort || 'console_id'
  const sortOrder = order || 'asc'

  if (!allowedFields.includes(sortField)) {
    response.status(400)
    response.send({message: 'Cannot sort by that field'})
    return
  }

  if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) {
    response.status(400)
    response.send({message: 'Invalid sort order'})
    return
  }

  let query = `SELECT * FROM consoles`
  const params = []

  if (platform) {
    query += ` WHERE platform = ?`
    params.push(platform)
  }

  query += ` ORDER BY console_id ASC`

  const consoles = await db.all(query, params)
  response.send(consoles)
})




app.get('/consoles/:id', async (req, res) => {
  const {id} = req.params

  const query = `
    SELECT * FROM consoles
    WHERE console_id = ?;
  `

  const consoleDetails = await db.get(query, [id])

  if (consoleDetails === undefined) {
    res.status(404)
    res.send({error: 'Console Not Found'})
  } else {
    res.send(consoleDetails)
  }
})



app.post('/consoles', async (request, response) => {
  const {name, platform, price_per_hour, status} = request.body

  if (!name || !platform || !price_per_hour || !status) {
    return response.status(400).send({
      message: 'All fields are required',
    })
  }

  if (typeof price_per_hour !== 'number' || price_per_hour <= 0) {
    return response.status(400).send({
      message: 'Price must be a positive number',
    })
  }

  const query = `
    INSERT INTO consoles
    (name, platform, price_per_hour, status)
    VALUES (?, ?, ?, ?)
  `

  await db.run(query, [name, platform, price_per_hour, status])

  response.status(201).send({
    message: 'Console Added Successfully',
  })
})



app.put('/consoles/:id', async (req, res) => {
  const {id} = req.params
  const {name, platform, price_per_hour, status} = req.body

  const query = `
    UPDATE consoles
    SET name = ?, platform = ?, price_per_hour = ?, status = ?
    WHERE console_id = ?;
  `

  const result = await db.run(query, [
    name,
    platform,
    price_per_hour,
    status,
    id,
  ])

  if (result.changes === 0) {
    res.status(404)
    res.send({error: 'Console Not Found'})
  } else {
    res.send({message: 'Console Updated Successfully'})
  }
})


app.delete('/consoles/:id', async (req, res) => {
  const {id} = req.params

  const query = `
    DELETE FROM consoles
    WHERE console_id = ?;
  `

  const result = await db.run(query, [id])

  if (result.changes === 0) {
    res.status(404)
    res.send({error: 'Console Not Found'})
  } else {
    res.send({message: 'Console Deleted Successfully'})
  }
})


app.get('/gamers', async (request, response) => {
  const gamers = await db.all(`SELECT * FROM gamers`)
  response.send(gamers)
})

app.get('/gamers/:id', async (request, response) => {
  const {id} = request.params

  const query = `
    SELECT * FROM gamers
    WHERE gamer_id = ?;
  `

  const gamer = await db.get(query, [id])

  if (gamer === undefined) {
    response.status(404)
    response.send({message: 'Gamer Not Found'})
  } else {
    response.send(gamer)
  }
})

// API: Update Gamer
app.put('/gamers/:id', async (request, response) => {
  const {id} = request.params
  const {gamer_name, age, email} = request.body

  const query = `
    UPDATE gamers
    SET gamer_name = ?, age = ?, email = ?
    WHERE gamer_id = ?
  `

  const result = await db.run(query, [
    gamer_name,
    age,
    email,
    id,
  ])

  if (result.changes === 0) {
    response.status(404)
    response.send({message: 'Gamer Not Found'})
  } else {
    response.send({message: 'Gamer Updated Successfully'})
  }
})

app.post('/gamers', async (request, response) => {
  const {gamer_name, age, email} = request.body

  if (!gamer_name || !age || !email) {
    response.status(400)
    response.send({message: 'All fields are required'})
  } else {
    const query = `
      INSERT INTO gamers (gamer_name, age, email)
      VALUES (?, ?, ?)
    `

    await db.run(query, [gamer_name, age, email])

    response.status(201)
    response.send({message: 'Gamer Added Successfully'})
  }
})

app.delete('/gamers/:id', async (request, response) => {
  const {id} = request.params

  const query = `
    DELETE FROM gamers
    WHERE gamer_id = ?;
  `

  const result = await db.run(query, [id])

  if (result.changes === 0) {
    response.status(404)
    response.send({message: 'Gamer Not Found'})
  } else {
    response.send({message: 'Gamer Deleted Successfully'})
  }
})

// API: Get Booking Details using JOIN
app.get('/bookings', async (request, response) => {
  const query = `
    SELECT
      bookings.booking_id,
      gamers.gamer_name,
      consoles.name AS console_name,
      bookings.booking_date,
      bookings.duration
    FROM bookings
    INNER JOIN gamers
    ON bookings.gamer_id = gamers.gamer_id
    INNER JOIN consoles
    ON bookings.console_id = consoles.console_id;
  `

  const bookings = await db.all(query)
  response.send(bookings)
})