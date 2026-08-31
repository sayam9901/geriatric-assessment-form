import { samplePatient } from './form-values';
import { assessmentSchema } from './schema';

// The age rule is checked against the assessment date, so the boundary is
// "60 on the day of the visit" — the interesting case, not today's date.
const withDateOfBirth = (dateOfBirth: string) => ({
  ...samplePatient,
  assessmentDate: '2026-08-07',
  dateOfBirth,
});

describe('assessmentSchema, age boundary', () => {
  it('accepts a patient who turns 60 on the assessment date', () => {
    const result = assessmentSchema.safeParse(withDateOfBirth('1966-08-07'));

    expect(result.success).toBe(true);
    expect(result.data?.dateOfBirth).toBe('1966-08-07');
  });

  it('rejects a patient one day short of 60, with the error on dateOfBirth', () => {
    const result = assessmentSchema.safeParse(withDateOfBirth('1966-08-08'));

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['dateOfBirth', 'This pathway is for patients aged 60 and over'],
    ]);
  });
});
