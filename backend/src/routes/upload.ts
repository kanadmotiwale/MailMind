import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { parse } from 'csv-parse'
import { z } from 'zod'
import { clearAllData, insertEmail } from '../services/db'

const router = Router()
const upload = multer({ dest: '../uploads/', limits: { fileSize: 50 * 1024 * 1024 } })

const REQUIRED_COLUMNS = ['id', 'from', 'to', 'subject', 'date', 'body']

const EmailRowSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().default(''),
  cc: z.string().default(''),
  subject: z.string().default(''),
  date: z.string().default(''),
  body: z.string().default(''),
})

router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Send a CSV as multipart field "file".' })
    return
  }

  try {
    const fs = await import('fs')
    const fileContent = fs.readFileSync(req.file.path, 'utf-8')

    const rows: Record<string, string>[] = await new Promise((resolve, reject) => {
      parse(fileContent, { columns: true, skip_empty_lines: true, trim: true }, (err, records) => {
        if (err) reject(err)
        else resolve(records)
      })
    })

    if (rows.length === 0) {
      res.status(400).json({ error: 'CSV is empty.' })
      return
    }

    const headers = Object.keys(rows[0])
    const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c))
    if (missing.length > 0) {
      res.status(400).json({
        error: `Missing required columns: ${missing.join(', ')}`,
        required: REQUIRED_COLUMNS,
        found: headers,
      })
      return
    }

    clearAllData()

    let inserted = 0
    for (const row of rows) {
      const parsed = EmailRowSchema.safeParse(row)
      if (!parsed.success) continue
      const d = parsed.data
      insertEmail({
        id: d.id,
        from_addr: d.from,
        to_addr: d.to,
        cc: d.cc,
        subject: d.subject,
        date: d.date,
        body: d.body,
      })
      inserted++
    }

    fs.unlinkSync(req.file.path)

    res.json({
      success: true,
      count: inserted,
      message: `${inserted} emails imported successfully.`,
    })
  } catch (err) {
    next(err)
  }
})

export default router
