import type { Assessment } from './schema';

/**
 * The shape the inputs hold while the form is being filled in.
 *
 * Keys and value types are derived from `Assessment` — nothing is re-declared by
 * hand. Each value is widened by the "not answered yet" value its Mantine input
 * reports: `''` for TextInput and a cleared NumberInput, `null` for DateInput
 * and Select, plain `false` for the checkboxes. The resolver validates this
 * draft and `transformValues` hands the parsed `Assessment` to the submit
 * handler, so the gap between the two shapes closes in exactly one place.
 */
export type AssessmentDraft = {
  [K in keyof Assessment]: Assessment[K] extends boolean ? boolean : Assessment[K] | '' | null;
};

export const emptyDraft: AssessmentDraft = {
  mrn: '',
  patientName: '',
  dateOfBirth: null,
  assessmentDate: null,
  mobility: null,
  barthelIndex: '',
  medicationCount: '',
  pharmacistReviewRequested: false,
  followUpDate: null,
  consentObtained: false,
};

/**
 * Invented patient behind the "Load sample patient" button. Typed as
 * `Assessment` because every value is already valid, which also makes it the
 * expected payload in the form test.
 */
export const samplePatient: Assessment = {
  mrn: 'MRN-004821',
  patientName: 'Sushila Deshpande',
  dateOfBirth: '1949-03-12',
  assessmentDate: '2026-08-07',
  mobility: 'cane',
  barthelIndex: 80,
  medicationCount: 3,
  pharmacistReviewRequested: false,
  followUpDate: '2026-09-04',
  consentObtained: true,
};
