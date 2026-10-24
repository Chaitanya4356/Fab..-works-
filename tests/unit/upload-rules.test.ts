import { describe, expect, it } from 'vitest'
import { fitWithin, validateFile } from '@/lib/upload/rules'

describe('validateFile', () => {
  it('accepts photos, PDFs and drawings', () => {
    expect(validateFile({ name: 'site.jpg', type: 'image/jpeg', size: 6_000_000 })).toEqual({ ok: true, kind: 'image' })
    expect(validateFile({ name: 'truss.pdf', type: 'application/pdf', size: 2_000_000 })).toEqual({ ok: true, kind: 'document' })
    expect(validateFile({ name: 'Shed GA.DWG', type: '', size: 3_000_000 })).toEqual({ ok: true, kind: 'document' })
  })
  it('lets big photos through because they are shrunk first', () => {
    expect(validateFile({ name: 'p.jpg', type: 'image/jpeg', size: 15_000_000 }).ok).toBe(true)
  })
  it('refuses documents over 10 MB', () => {
    expect(validateFile({ name: 'big.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 + 1 }))
      .toEqual({ ok: false, message: 'This file is larger than 10 MB.' })
  })
  it('refuses photos over 40 MB', () => {
    expect(validateFile({ name: 'huge.png', type: 'image/png', size: 41 * 1024 * 1024 }))
      .toEqual({ ok: false, message: 'This photo is too large to upload.' })
  })
  it('explains HEIC photos', () => {
    expect(validateFile({ name: 'IMG_0001.HEIC', type: 'image/heic', size: 2_000_000 }))
      .toEqual({ ok: false, message: "HEIC photos can't be uploaded. Choose a JPEG or PNG instead." })
  })
  it('refuses other file types', () => {
    expect(validateFile({ name: 'notes.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1000 }))
      .toEqual({ ok: false, message: "This file type isn't supported. Use a photo (JPEG, PNG or WebP), a PDF, or a DWG or DXF drawing." })
  })
})

describe('fitWithin', () => {
  it('shrinks the long side and keeps the shape', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
    expect(fitWithin(1601, 1, 1600)).toEqual({ width: 1600, height: 1 })
  })
  it('never enlarges', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})
