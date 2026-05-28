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

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) validateFile(file)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleInput}
        />
        <div className="text-4xl mb-3">📂</div>
        <p className="text-gray-600 font-medium">Drag & drop your emails CSV</p>
        <p className="text-gray-400 text-sm mt-1">or</p>
        <button
          type="button"
          className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
        >
          Browse files
        </button>
        <p className="text-xs text-gray-400 mt-3">
          Required columns: {REQUIRED_COLUMNS.join(', ')}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          <span className="font-semibold">Invalid CSV: </span>{error}
        </div>
      )}

      {valid && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2">
          <span className="text-green-500 font-bold">✓</span>
          <span>
            Valid CSV — <strong>{valid.count} emails</strong> ready ({valid.file.name})
          </span>
        </div>
      )}
    </div>
  )
}
