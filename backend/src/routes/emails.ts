import { Router, Request, Response } from 'express'
import { getEmails, getEmailById, countEmails } from '../services/db'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  const tool = typeof req.query.tool === 'string' ? req.query.tool : undefined
  const search = typeof req.query.search === 'string' ? req.query.search : undefined

  const emails = getEmails(tool, search)
  const totalAll = countEmails()
  res.json({ emails, total: emails.length, totalAll })
})

router.get('/:id', (req: Request, res: Response) => {
  const email = getEmailById(req.params.id)
  if (!email) {
    res.status(404).json({ error: 'Email not found.' })
    return
  }
  res.json(email)
})

export default router
