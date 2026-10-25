import 'server-only'
import { DOC_TYPES, type DocNumberFormat, type DocType } from '@/lib/doc-number'
import { financialYear } from '@/lib/fy'
import { createClient } from '@/lib/supabase/server'

export async function getSettings() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

export async function getStorageUsage(): Promise<{ filesBytes: number; databaseBytes: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('storage_usage')
  if (error) throw error
  const row = data[0]
  return { filesBytes: row?.files_bytes ?? 0, databaseBytes: row?.database_bytes ?? 0 }
}

export type DocNumberFormatRow = DocNumberFormat & { nextNumber: number }

/** Each document type's format and the next number its current series will give. */
export async function getDocNumberFormats(today: string): Promise<Record<DocType, DocNumberFormatRow>> {
  const supabase = await createClient()
  const [formats, counters] = await Promise.all([
    supabase.from('doc_number_formats').select('doc_type, prefix, separator, year_style, digits'),
    supabase.from('doc_counters').select('doc_type, series, last_number'),
  ])
  if (formats.error) throw formats.error
  if (counters.error) throw counters.error

  const fy = financialYear(today)
  const result = {} as Record<DocType, DocNumberFormatRow>
  for (const type of DOC_TYPES) {
    const row = formats.data.find((f) => f.doc_type === type)
    if (!row) throw new Error(`No number format for ${type}`)
    const yearStyle = row.year_style as DocNumberFormat['yearStyle']
    const series = yearStyle === 'none' ? 'all' : fy
    const counter = counters.data.find((c) => c.doc_type === type && c.series === series)
    result[type] = {
      prefix: row.prefix,
      separator: row.separator as DocNumberFormat['separator'],
      yearStyle,
      digits: row.digits,
      nextNumber: (counter?.last_number ?? 0) + 1,
    }
  }
  return result
}

/** A 10-minute link to the logo, or null. */
export async function getLogoUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  const supabase = await createClient()
  const { data } = await supabase.storage.from('files').createSignedUrl(path, 600)
  return data?.signedUrl ?? null
}
