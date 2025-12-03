const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { MongoClient } = require('mongodb')
const bcrypt = require('bcryptjs')

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

app.post('/api/users', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'db_not_connected' })
    const { email, password, name } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' })
    const existing = await db.collection('users').findOne({ email })
    if (existing) return res.status(409).json({ error: 'email_exists' })
    const passwordHash = await bcrypt.hash(password, 10)
    const doc = { email, name: name || '', passwordHash, createdAt: new Date() }
    const r = await db.collection('users').insertOne(doc)
    return res.status(201).json({ id: r.insertedId.toString(), email })
  } catch (err) {
    return res.status(500).json({ error: 'create_user_error' })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'db_not_connected' })
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' })
    const user = await db.collection('users').findOne({ email })
    if (!user) return res.status(401).json({ error: 'invalid_credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' })
    return res.json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: 'login_error' })
  }
})

async function start() {
  try {
    if (mongoUri) {
      const needsAuthSource = !/authSource=/.test(mongoUri)
      const options = needsAuthSource ? { authSource: 'admin', serverSelectionTimeoutMS: 5000 } : { serverSelectionTimeoutMS: 5000 }
      client = new MongoClient(mongoUri, options)
      await client.connect()
      db = mongoDbName ? client.db(mongoDbName) : client.db()
      await db.collection('users').createIndex({ email: 1 }, { unique: true })
    }
    app.listen(port)
  } catch (err) {
    process.exit(1)
  }
}

start()
