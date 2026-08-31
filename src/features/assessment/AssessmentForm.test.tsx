import { render, screen, userEvent, waitFor } from '@test-utils';
import { AssessmentForm } from './AssessmentForm';
import { emptyDraft, samplePatient } from './form-values';
import { type Assessment, assessmentSchema } from './schema';

const noSave = () => Promise.resolve();

describe('AssessmentForm', () => {
  it('saves the parsed assessment when the sample patient is submitted', async () => {
    const onSave = vi.fn<(assessment: Assessment) => Promise<void>>(noSave);
    render(<AssessmentForm onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: 'Load sample patient' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save assessment' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(samplePatient));
    expect(await screen.findByText('Assessment saved')).toBeVisible();
  });

  it('shows one error per required field on an empty submit and does not save', async () => {
    const onSave = vi.fn<(assessment: Assessment) => Promise<void>>(noSave);
    // Expected messages come from the schema, so the test cannot drift from it.
    const emptyResult = assessmentSchema.safeParse(emptyDraft);
    const messages = emptyResult.error?.issues.map((issue) => issue.message) ?? [];
    expect(messages).toHaveLength(9);

    render(<AssessmentForm onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save assessment' }));

    await waitFor(() => expect(screen.getByText(messages[0])).toBeVisible());
    messages.forEach((message) => expect(screen.getByText(message)).toBeVisible());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range Barthel Index instead of clamping it on blur', async () => {
    render(<AssessmentForm onSave={noSave} />);
    const barthelIndex = screen.getByLabelText(/^Barthel Index/);

    await userEvent.type(barthelIndex, '105');
    await userEvent.tab();

    expect(barthelIndex).toHaveValue('105');
    expect(await screen.findByText('Barthel Index ranges from 0 to 100')).toBeVisible();
  });
});
