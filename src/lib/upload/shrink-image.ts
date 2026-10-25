import { fitWithin } from './rules'

export const UNREADABLE = "This image couldn't be read. Choose a JPEG or PNG instead."

type Decode = (file: Blob, options?: ImageBitmapOptions) => Promise<ImageBitmap>

/**
 * Decodes a photo, applying the phone's EXIF rotation. Browsers that predate the 'from-image' orientation option
 * reject it with a TypeError, so decoding is retried without it rather than refusing every photo.
 */
export async function decodeImage(file: Blob, decode: Decode = (f, o) => createImageBitmap(f, o)): Promise<ImageBitmap> {
  try {
    return await decode(file, { imageOrientation: 'from-image' })
  } catch (error) {
    if (!(error instanceof TypeError)) throw new Error(UNREADABLE)
  }
  try {
    return await decode(file)
  } catch {
    throw new Error(UNREADABLE)
  }
}

/**
 * Shrinks a photo in the browser before upload: upright (phone EXIF rotation applied), at most maxSide pixels on the
 * long side, as a JPEG on a white background.
 */
export async function shrinkImage(file: File, opts: { maxSide?: number; quality?: number } = {}): Promise<File> {
  const maxSide = opts.maxSide ?? 1600
  const quality = opts.quality ?? 0.75

  const bitmap = await decodeImage(file)
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
