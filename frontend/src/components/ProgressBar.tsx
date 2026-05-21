interface Props {
  value: number
  max: number
  className?: string
}

export function ProgressBar({ value, max, className = '' }: Props) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 overflow-hidden ${className}`}>
      <div
        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
