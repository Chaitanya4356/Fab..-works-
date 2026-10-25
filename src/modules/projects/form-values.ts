// Kept out of the 'use client' form file: Server Components need the real object, not a client reference.

export type ProjectFormValues = {
  customerId: string
  title: string
  siteAddress: string
  description: string
  status: string
  startDate: string
  dueDate: string
  completedDate: string
  contractValue: string
  estMaterial: string
  estLabour: string
  estPainting: string
  estTransport: string
  estOther: string
  notes: string
}

export const EMPTY_PROJECT: ProjectFormValues = {
  customerId: '', title: '', siteAddress: '', description: '', status: 'planned', startDate: '', dueDate: '',
  completedDate: '', contractValue: '', estMaterial: '', estLabour: '', estPainting: '', estTransport: '', estOther: '',
  notes: '',
}
