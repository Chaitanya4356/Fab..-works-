// Kept out of the 'use client' form file: Server Components need the real object, not a client reference.

export type CustomerFormValues = {
  name: string
  contactPerson: string
  phone: string
  altPhone: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  gstin: string
  notes: string
}

export const EMPTY_CUSTOMER: CustomerFormValues = {
  name: '', contactPerson: '', phone: '', altPhone: '', email: '', address: '', city: '', state: '', pincode: '', gstin: '', notes: '',
}
