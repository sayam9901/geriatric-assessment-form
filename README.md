# Geriatric Care Assessment Form

A one-page assessment form a visiting nurse fills in at an elderly patient's home:
10 fields, validated end-to-end by the supplied Zod schema through
`@mantine/form`'s `schemaResolver`.

React 19 · TypeScript · Vite · Mantine 9 · Zod 4.

All data in this repo is invented.

## Running it

Requires Node 20+ and Yarn 4 (the repo pins it via `packageManager`; run
`corepack enable` once if `yarn` is not already on the path).

```bash
yarn install
yarn dev        # http://localhost:5173
```

Checks:

```bash
yarn test       # typecheck + format check + lint + vitest + build
yarn vitest     # tests only
```

`yarn test` is green.

## How it is wired

```
src/features/assessment/
  schema.ts            the given Zod schema, rules and messages unchanged
  form-values.ts       AssessmentDraft (derived from Assessment), empty draft, sample patient
  mobility-options.ts  Select data built from MOBILITY
  save-assessment.ts   the fake ~800ms save
  AssessmentForm.tsx   the 10 inputs, the resolver, the success panel
src/pages/Assessment.page.tsx   Container + heading around the form
```

The schema is the only place a rule exists. The component contains no regex, no
range check and no polypharmacy threshold — `schemaResolver(assessmentSchema,
{ sync: true })` is handed to `useForm` as its `validate`, so every message the
nurse sees comes from `schema.ts`.

**The two value shapes.** An empty form cannot satisfy `Assessment` — a blank
NumberInput is `''`, an untouched DateInput is `null`. Rather than hand-writing a
second interface, `AssessmentDraft` is mapped over `keyof Assessment` and widens
each value with the "not answered yet" value its input reports:

```ts
export type AssessmentDraft = {
  [K in keyof Assessment]: Assessment[K] extends boolean ? boolean : Assessment[K] | '' | null;
};
```

The form is then `useForm<AssessmentDraft, Assessment>`, and
`transformValues: (values) => assessmentSchema.parse(values)` closes the gap in
one line. Mantine only calls `transformValues` after validation has passed, so
the submit handler and the success panel receive Zod's parsed output — narrowed
types, trimmed strings — not the raw form state. No `any`, no cast.

Errors render through each component's own `error` prop via `getInputProps`, so
they appear under the field they belong to. `validateInputOnBlur: true` plus
Mantine's default `clearInputErrorOnChange` gives blur-and-submit validation with
untouched fields staying quiet: on blur, only the blurred path's message is
pulled out of the resolver's result, so an empty form is silent until you touch
something and shows exactly 9 errors on submit.

`form.submitting` drives the button's `loading` state — Mantine tracks it because
the submit handler returns a promise, so there is no extra `useState` for it.

## Decisions I made where the brief left room

- **`clampBehavior="none"` on both NumberInputs.** Mantine's default clamps to
  `min`/`max` on blur, which would silently rewrite a typed `105` to `100` and
  hide the very error the fixture table expects. Out-of-range and non-multiple-of-5
  scores now reach the schema and are rejected out loud. Decimals are allowed
  through for the same reason: `82.5` should produce "must be a whole number",
  not be quietly swallowed by the input. `step={5}` still drives the spinner.
- **Consent checkbox label.** The table gives the field label "Consent" and the
  checkbox text "Patient or representative has given consent". A checkbox whose
  label sits above it and repeats itself reads badly, so the sentence *is* the
  label. `mobility` and the other nine fields use the labels as given.
- **`sync: true` on the resolver.** The schema has no async refinements, so the
  sync resolver keeps `form.validate()` synchronous and the tests free of
  needless waiting.
- **Success panel placement.** The `Alert` sits below the form and clears itself
  as soon as any value changes, so a stale "saved" payload never sits next to
  edited fields.
- **Template demo code removed.** `Welcome`, `ColorSchemeToggle`, the router and
  `react-router-dom` are gone — routing is out of scope and they were dead code.
  Deleting the last CSS module left `stylelint '**/*.css'` with nothing to lint,
  which it treats as an error, so that script now passes `--allow-empty-input`.
  No lint or format rule was weakened. The template's Storybook config is left
  untouched (out of scope, and `yarn test` does not run it).
- **`maxDate` on the assessment date** is the brief's UI guard, not a rule: the
  schema says nothing about future assessment dates, so nothing is duplicated.

## Tests

`schema.test.ts` — the real boundary: `dateOfBirth` exactly 60 years before the
assessment date passes; one day short fails with a single issue on `dateOfBirth`.
The age rule is measured against the assessment date, not today, so the test is
written against a fixed assessment date.

`AssessmentForm.test.tsx` — loads the sample patient, submits, asserts the save
handler was called with the parsed values and that the success panel appears.
Two extra short tests lock the decisions above: an empty submit renders exactly
the 9 messages the schema produces (the expected list is read from the schema, so
the test cannot drift) and never calls the save handler; and `105` in Barthel
Index survives blur and is rejected rather than clamped.

## Time spent

About 2 hours, including reading the brief, checking each fixture row from
section 5 against the schema before building the UI, and writing this README.

## What I would do next

- `aria-invalid` is missing on Mantine's `Checkbox` when it has an error (the
  message renders, but assistive tech is not told the control is invalid). I
  would either wrap the two checkboxes or raise it upstream.
- A `dateParser` so nurses can type `07/08/2026` as well as the ISO format.
- Focus the first invalid field on a failed submit — Mantine gives
  `form.getInputNode(path)` for this; it needs an ordered field list to be worth
  the code.
