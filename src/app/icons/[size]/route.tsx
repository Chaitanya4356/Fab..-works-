import { ImageResponse } from 'next/og'
import { brandIcon } from '@/lib/brand-icon'

const SIZES = [192, 512]

export const dynamicParams = false

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size)
  if (!SIZES.includes(size)) return new Response('Not found', { status: 404 })
  return new ImageResponse(brandIcon(size), { width: size, height: size })
}
