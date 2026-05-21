import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import uploadRouter from './routes/upload'
import emailsRouter from './routes/emails'
import agentRouter from './routes/agent'
import toolsRouter from './routes/tools'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT ?? 3001

const allowedOrigins = ['http://localhost:5173']
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL)
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.use('/api/upload', uploadRouter)
app.use('/api/emails', emailsRouter)
app.use('/api/agent', agentRouter)
app.use('/api/tools', toolsRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`MailMind backend listening on http://localhost:${PORT}`)
})
