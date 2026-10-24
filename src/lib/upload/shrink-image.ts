import { fitWithin } from './rules'

export const UNREADABLE = "This image couldn't be read. Choose a JPEG or PNG instead."

/**
 * Shrinks a photo in the browser before upload: upright (phone EXIF rotation applied), at most maxSide pixels on the
 * long side, as a JPEG on a white background.
 */
export async function shrinkImage(file: File, opts: { maxSide?: number; quality?: number } = {}): Promise<File> {
  const maxSide = opts.maxSide ?? 1600
  const quality = opts.quality ?? 0.75

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(UNREADABLE)
  }

  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error(UNREADABLE)
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error(UNREADABLE)
  const base = file.name.replace(/\.[^.]+$/, '') || 'photo'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
}
