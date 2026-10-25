/** A GET search form: works without JavaScript and keeps the other filters (but starts again at page 1). */
export function SearchBox({
  placeholder,
  value,
  keep = {},
}: {
  placeholder: string
  value?: string
  keep?: Record<string, string>
}) {
  return (
    <form method="get" role="search" className="flex gap-2">
      {Object.entries(keep).map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}
      <label className="sr-only" htmlFor="list-search">
        Search
      </label>
      <input
        id="list-search"
        name="q"
        type="search"
        defaultValue={value}
        placeholder={placeholder}
        className="field min-w-0 flex-1"
      />
      <button type="submit" className="button-secondary">
        Search
      </button>
    </form>
  )
}
