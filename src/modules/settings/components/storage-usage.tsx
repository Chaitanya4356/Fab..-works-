import { formatBytes } from '@/lib/format'

export function StorageUsage({ filesBytes, databaseBytes }: { filesBytes: number; databaseBytes: number }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>Files: {formatBytes(filesBytes)} of 1 GB</p>
      <p>Database: {formatBytes(databaseBytes)} of 500 MB</p>
      <p className="text-muted">These are the limits of the free plans SteelFlow runs on.</p>
    </div>
  )
}
