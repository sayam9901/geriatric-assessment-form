import dayjs from 'dayjs';
import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Code,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { schemaResolver, useForm } from '@mantine/form';
import { type AssessmentDraft, emptyDraft, samplePatient } from './form-values';
import { mobilityOptions } from './mobility-options';
import { saveAssessment } from './save-assessment';
import { type Assessment, assessmentSchema } from './schema';

interface AssessmentFormProps {
  /** Replaced in tests; defaults to the fake ~800ms save. */
  onSave?: (assessment: Assessment) => Promise<void>;
}

export function AssessmentForm({ onSave = saveAssessment }: AssessmentFormProps) {
  const [savedAssessment, setSavedAssessment] = useState<Assessment | null>(null);

  const form = useForm<AssessmentDraft, Assessment>({
    initialValues: emptyDraft,
    validate: schemaResolver(assessmentSchema, { sync: true }),
    validateInputOnBlur: true,
    // Runs only after validation passes, so the submit handler and the success
    // panel see what Zod returned (trimmed strings, narrowed types) instead of
    // the raw draft the inputs produced.
    transformValues: (values) => assessmentSchema.parse(values),
    onValuesChange: () => setSavedAssessment(null),
  });

  const handleSubmit = async (assessment: Assessment) => {
    await onSave(assessment);
    setSavedAssessment(assessment);
  };

  const loadSamplePatient = () => {
    form.setValues(samplePatient);
    form.clearErrors();
  };

  return (
    <Paper withBorder shadow="sm" radius="md" p="lg">
      <form onSubmit={form.onSubmit(handleSubmit)} noValidate>
        <Stack gap="md">
          <TextInput
            label="Medical record number"
            placeholder="MRN-004821"
            withAsterisk
            {...form.getInputProps('mrn')}
          />

          <TextInput label="Patient name" withAsterisk {...form.getInputProps('patientName')} />

          <DateInput
            label="Date of birth"
            placeholder="YYYY-MM-DD"
            withAsterisk
            {...form.getInputProps('dateOfBirth')}
          />

          <DateInput
            label="Assessment date"
            placeholder="YYYY-MM-DD"
            maxDate={dayjs().format('YYYY-MM-DD')}
            withAsterisk
            {...form.getInputProps('assessmentDate')}
          />

          <Select
            label="Mobility"
            placeholder="Select mobility status"
            data={mobilityOptions}
            withAsterisk
            {...form.getInputProps('mobility')}
          />

          {/* clampBehavior="none" so an out-of-range score reaches the schema and
              is rejected out loud, rather than being quietly clamped on blur. */}
          <NumberInput
            label="Barthel Index"
            description="0-100, scored in steps of 5"
            step={5}
            min={0}
            max={100}
            clampBehavior="none"
            withAsterisk
            {...form.getInputProps('barthelIndex')}
          />

          <NumberInput
            label="Regular medications"
            min={0}
            max={30}
            clampBehavior="none"
            withAsterisk
            {...form.getInputProps('medicationCount')}
          />

          <Checkbox
            label="Pharmacist review requested"
            {...form.getInputProps('pharmacistReviewRequested', { type: 'checkbox' })}
          />

          <DateInput
            label="Next review date"
            placeholder="YYYY-MM-DD"
            withAsterisk
            {...form.getInputProps('followUpDate')}
          />

          <Checkbox
            label="Patient or representative has given consent"
            {...form.getInputProps('consentObtained', { type: 'checkbox' })}
          />

          <Group mt="xs">
            <Button type="submit" loading={form.submitting}>
              Save assessment
            </Button>
            <Button variant="default" onClick={loadSamplePatient} disabled={form.submitting}>
              Load sample patient
            </Button>
          </Group>
        </Stack>
      </form>

      {savedAssessment && (
        <Alert mt="lg" color="green" title="Assessment saved">
          <Code block>{JSON.stringify(savedAssessment, null, 2)}</Code>
        </Alert>
      )}
    </Paper>
  );
}
