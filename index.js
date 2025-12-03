const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { MongoClient } = require('mongodb')

const app = express()
app.use(cors())
app.use(bodyParser.json())

const port = process.env.PORT || 3000
const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.DATABASE_URL
const mongoDbName = process.env.MONGODB_DB

let client
let db

app.get('/health', (req, res) => {
  res.json({ ok: true, port, dbConnected: !!db })
})

app.get('/api/ping', (req, res) => {
  res.json({ pong: true })
})

app.get('/api/items', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'db_not_connected' })
    const items = await db.collection('items').find({}).limit(50).toArray()
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: 'db_error' })
  }
})

async function start() {
  try {
    if (mongoUri) {
      client = new MongoClient(mongoUri)
      await client.connect()
      db = mongoDbName ? client.db(mongoDbName) : client.db()
    }
    app.listen(port)
  } catch (err) {
    process.exit(1)
  }
}

start()

