import { useRef, useState, DragEvent } from 'react'
import Papa from 'papaparse'

const REQUIRED_COLUMNS = ['id', 'from', 'to', 'subject', 'date', 'body']

interface Props {
  onFile: (file: File) => void
}

export function DropZone({ onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [valid, setValid] = useState<{ file: File; count: number } | null>(null)

  function validateFile(file: File) {
    setError(null)
    setValid(null)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete(results) {
        const headers = results.meta.fields ?? []
        const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c))
        if (missing.length > 0) {
          setError(`Missing columns: ${missing.join(', ')}`)
          return
        }
        Papa.parse<Record<string, string>>(file, {
          header: true,
          skipEmptyLines: true,
          complete(full) {
            const count = full.data.length
            setValid({ file, count })
            onFile(file)
          },
        })
      },
    })
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) validateFile(file)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) validateFile(f) }}
        />
        <svg className="w-8 h-8 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm font-medium text-slate-600">Drag & drop your emails CSV</p>
        <p className="text-xs text-slate-400 mt-1 mb-3">or</p>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Browse files
        </button>
        <p className="text-xs text-slate-400 mt-3">
          Required: {REQUIRED_COLUMNS.join(', ')}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-4 py-2.5 text-red-600 text-sm">
          <span className="font-medium">Invalid CSV — </span>{error}
        </div>
      )}

      {valid && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-2.5 text-emerald-700 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Valid CSV — <strong>{valid.count} emails</strong> ready ({valid.file.name})
        </div>
      )}
    </div>
  )
}
