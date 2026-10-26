// Kept out of the 'use client' form file: Server Components need the real object, not a client reference.
import type { Worker } from './queries'

export type WorkerFormValues = {
  fullName: string
  trade: string
  phone: string
  altPhone: string
  address: string
  joiningDate: string
  skills: string
  experienceYears: string
  payType: string
  payRate: string
  emergencyContactName: string
  emergencyContactPhone: string
  notes: string
}

export const EMPTY_WORKER: WorkerFormValues = {
  fullName: '', trade: '', phone: '', altPhone: '', address: '', joiningDate: '', skills: '', experienceYears: '',
  payType: '', payRate: '', emergencyContactName: '', emergencyContactPhone: '', notes: '',
}

export function workerFormValues(w: Worker): WorkerFormValues {
  return {
    fullName: w.full_name,
    trade: w.trade ?? '',
    phone: w.phone ?? '',
    altPhone: w.alt_phone ?? '',
    address: w.address ?? '',
    joiningDate: w.joining_date ?? '',
    skills: w.skills ?? '',
    experienceYears: w.experience_years === null ? '' : String(w.experience_years),
    payType: w.pay_type ?? '',
    payRate: w.pay_rate === null ? '' : String(w.pay_rate),
    emergencyContactName: w.emergency_contact_name ?? '',
    emergencyContactPhone: w.emergency_contact_phone ?? '',
    notes: w.notes ?? '',
  }
}
