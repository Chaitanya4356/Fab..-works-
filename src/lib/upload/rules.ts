export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_RAW_IMAGE_BYTES = 40 * 1024 * 1024

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const DOCUMENT_EXTENSIONS = ['.pdf', '.dwg', '.dxf']
const HEIC = /\.hei[cf]$/i

export type FileCheck = { ok: true; kind: 'image' | 'document' } | { ok: false; message: string }

/** Whether a file can be uploaded. Photos may be large because they are shrunk before upload. */
export function validateFile(meta: { name: string; type: string; size: number }): FileCheck {
  const name = meta.name.toLowerCase()
  if (meta.type === 'image/heic' || meta.type === 'image/heif' || HEIC.test(name)) {
    return { ok: false, message: "HEIC photos can't be uploaded. Choose a JPEG or PNG instead." }
  }
  if (IMAGE_TYPES.includes(meta.type)) {
    if (meta.size > MAX_RAW_IMAGE_BYTES) return { ok: false, message: 'This photo is too large to upload.' }
    return { ok: true, kind: 'image' }
  }
  if (meta.type === 'application/pdf' || DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    if (meta.size > MAX_FILE_BYTES) return { ok: false, message: 'This file is larger than 10 MB.' }
    return { ok: true, kind: 'document' }
  }
  return {
    ok: false,
    message: "This file type isn't supported. Use a photo (JPEG, PNG or WebP), a PDF, or a DWG or DXF drawing.",
  }
}

/** The largest size inside a maxSide × maxSide box with the same shape. Never enlarges. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
