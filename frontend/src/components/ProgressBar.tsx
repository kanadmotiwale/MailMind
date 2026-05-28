interface Props {
  value: number
  max: number
  className?: string
}

export function ProgressBar({ value, max, className = '' }: Props) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className={`w-full bg-slate-100 rounded-full h-1.5 overflow-hidden ${className}`}>
      <div
        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
