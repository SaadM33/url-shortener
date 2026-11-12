import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { z } from 'zod'

import { ApiError } from '@/api/client'

/** Puts server-side (422) field errors on the matching form fields; returns a message for everything else. */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly Path<T>[]): string | null {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.'
  let placed = false
  for (const [name, message] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(name)) {
      setError(name as Path<T>, { message })
      placed = true
    }
  }
  return placed ? null : error.message
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.')

// mirrors the API's rules so users get instant feedback
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Use at least 3 characters')
  .max(50, 'Use at most 50 characters')
  .regex(/^[A-Za-z0-9_.-]+$/, 'Letters, numbers, dots, dashes and underscores only')
