import { Container, Stack, Text, Title } from '@mantine/core';
import { AssessmentForm } from '../features/assessment/AssessmentForm';

export function AssessmentPage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={1}>Geriatric Care Assessment</Title>
          <Text c="dimmed">Completed by the visiting nurse during a home visit.</Text>
        </Stack>
        <AssessmentForm />
      </Stack>
    </Container>
  );
}
