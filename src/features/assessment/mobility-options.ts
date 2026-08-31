import { MOBILITY } from './schema';

/** 'wheelchair' -> 'Wheelchair', 'home_visit' -> 'Home visit'. */
const toLabel = (value: string) =>
  value.replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase());

/** Select data built from MOBILITY: adding a value there is the only edit needed. */
export const mobilityOptions = MOBILITY.map((value) => ({ value, label: toLabel(value) }));
