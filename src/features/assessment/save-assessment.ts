import type { Assessment } from './schema';

const SAVE_DELAY_MS = 800;

/** Stands in for the request a real backend would receive. */
export function saveAssessment(_assessment: Assessment): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, SAVE_DELAY_MS);
  });
}
