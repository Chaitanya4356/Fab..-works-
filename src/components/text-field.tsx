/** A labelled input with its error under it, for the record forms. */
export function TextField({
  label,
  error,
  className = '',
  ...input
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-medium ${className}`}>
      {label}
      <input {...input} aria-invalid={Boolean(error)} className="field" />
      {error && <span className="text-sm font-normal text-oxide">{error}</span>}
    </label>
  )
}

export function FormMessage({ message }: { message: { text: string; good: boolean } | null }) {
  if (!message) return null
  return (
    <p role="status" className={message.good ? 'text-sm text-ok' : 'text-sm text-oxide'}>
      {message.text}
    </p>
  )
}
