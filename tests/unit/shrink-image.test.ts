import { describe, expect, it } from 'vitest'
import { UNREADABLE, decodeImage } from '@/lib/upload/shrink-image'

const bitmap = { width: 4000, height: 3000, close() {} } as unknown as ImageBitmap

describe('decodeImage', () => {
  it('keeps phone photos upright when the browser supports it', async () => {
    const calls: unknown[] = []
    const decode = async (_file: Blob, options?: ImageBitmapOptions) => {
      calls.push(options)
      return bitmap
    }
    expect(await decodeImage(new Blob(['x']), decode)).toBe(bitmap)
    expect(calls).toEqual([{ imageOrientation: 'from-image' }])
  })

  it('retries without the orientation option when an older browser rejects it', async () => {
    const calls: unknown[] = []
    const decode = async (_file: Blob, options?: ImageBitmapOptions) => {
      calls.push(options)
      if (options) throw new TypeError("The provided value 'from-image' is not a valid enum value of type ImageOrientation.")
      return bitmap
    }
    expect(await decodeImage(new Blob(['x']), decode)).toBe(bitmap)
    expect(calls).toEqual([{ imageOrientation: 'from-image' }, undefined])
  })

  it('explains an image that cannot be read', async () => {
    const decode = async () => {
      throw new DOMException('The source image could not be decoded.', 'InvalidStateError')
    }
    await expect(decodeImage(new Blob(['x']), decode)).rejects.toThrow(UNREADABLE)
  })
})
