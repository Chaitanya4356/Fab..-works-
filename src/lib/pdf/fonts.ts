import path from 'node:path'
import { Font } from '@react-pdf/renderer'

let registered = false

/** Noto Sans has the ₹ sign (spec 4.1). Registered once per server process; next.config ships the files. */
export function registerPdfFonts(): void {
  if (registered) return
  const dir = path.join(process.cwd(), 'src/lib/pdf/fonts')
  Font.register({
    family: 'Noto Sans',
    fonts: [
      { src: path.join(dir, 'NotoSans-Regular.ttf'), fontWeight: 400 },
      { src: path.join(dir, 'NotoSans-Bold.ttf'), fontWeight: 700 },
    ],
  })
  // Words and numbers are never split across lines.
  Font.registerHyphenationCallback((word) => [word])
  registered = true
}
