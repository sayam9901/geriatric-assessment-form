import { z } from 'zod';

export const MOBILITY = ['independent', 'cane', 'walker', 'wheelchair', 'bedbound'] as const;

// '2026-08-07' -> '1966-08-07'. ISO date strings compare correctly with < and >.
const minus60Years = (iso: string) => `${Number(iso.slice(0, 4)) - 60}${iso.slice(4)}`;

export const assessmentSchema = z
  .object({
    mrn: z
      .string()
      .trim()
      .regex(/^MRN-\d{6}$/, { error: 'Must look like MRN-004821' }),

    patientName: z
      .string()
      .trim()
      .min(2, { error: 'Patient name must be at least 2 characters' })
      .max(60, { error: 'Patient name cannot exceed 60 characters' }),

    dateOfBirth: z.iso.date({ error: 'Date of birth is required' }),

    assessmentDate: z.iso.date({ error: 'Assessment date is required' }),

    mobility: z.enum(MOBILITY, { error: 'Select a mobility status' }),

    barthelIndex: z
      .number({ error: 'Barthel Index score is required' })
      .int({ error: 'Barthel Index must be a whole number' })
      .min(0, { error: 'Barthel Index ranges from 0 to 100' })
      .max(100, { error: 'Barthel Index ranges from 0 to 100' })
      .multipleOf(5, { error: 'Barthel Index is scored in steps of 5' }),

    medicationCount: z
      .number({ error: 'Enter the number of regular medications' })
      .int({ error: 'Medication count must be a whole number' })
      .min(0, { error: 'Medication count cannot be negative' })
      .max(30, { error: 'Enter 30 or fewer' }),

    pharmacistReviewRequested: z.boolean(),

    followUpDate: z.iso.date({ error: 'Next review date is required' }),

    consentObtained: z.literal(true, {
      error: 'Consent must be obtained before the assessment can be saved',
    }),
  })
  .refine(
    (d) => !d.dateOfBirth || !d.assessmentDate || d.dateOfBirth <= minus60Years(d.assessmentDate),
    {
      error: 'This pathway is for patients aged 60 and over',
      path: ['dateOfBirth'],
    }
  )
  .refine((d) => !d.followUpDate || !d.assessmentDate || d.followUpDate > d.assessmentDate, {
    error: 'Next review must be after the assessment date',
    path: ['followUpDate'],
  })
  .refine((d) => d.medicationCount < 5 || d.pharmacistReviewRequested === true, {
    error: 'Five or more medications is polypharmacy: a pharmacist review is required',
    path: ['pharmacistReviewRequested'],
  });

export type Assessment = z.infer<typeof assessmentSchema>;
