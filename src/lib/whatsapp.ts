/** A WhatsApp chat link: with the customer's 10-digit mobile it opens their chat, without one it lets you pick a contact. */
export function whatsappUrl(phone: string | null, text: string): string {
  const to = phone && /^\d{10}$/.test(phone) ? `91${phone}` : ''
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`
}
