import { expect, it } from 'vitest'
import { whatsappUrl } from '@/lib/whatsapp'
import { quotationShareText } from '@/modules/quotations/pdf-model'

it('opens a chat with the customer, or lets you pick one when there is no mobile', () => {
  expect(whatsappUrl('9876543210', 'Hello & welcome')).toBe('https://wa.me/919876543210?text=Hello%20%26%20welcome')
  expect(whatsappUrl(null, 'Hello')).toBe('https://wa.me/?text=Hello')
})
it('writes the share message', () => {
  expect(quotationShareText({ workshopName: 'Sri Sai Fabricators', label: 'QT/2026-27/0001-R1', title: 'Warehouse shed', grandTotal: 115000 }))
    .toBe('Quotation QT/2026-27/0001-R1 from Sri Sai Fabricators for Warehouse shed: ₹1,15,000.00')
})
