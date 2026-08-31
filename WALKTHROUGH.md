# Walkthrough — what this is, how it works, and what to be ready to explain

This file is for you, not the reviewer. `README.md` is the submission document;
this one explains the reasoning behind every choice so you can own it on the
follow-up call. (Delete this file before submitting if you would rather not ship
it — nothing depends on it.)

---

## 1. What the project is

A single-page form. A visiting nurse sits in an elderly patient's home, fills in
10 fields, and hits save. Nothing is persisted — the "save" is an 800 ms timer —
because the exercise is not about a backend. It is about three things:

1. Can you wire a form to a **validation schema you did not write** without
   leaking its rules into your UI?
2. Can you handle the **type mismatch** between "form being filled in" and
   "valid submitted data"?
3. Do you notice the **traps** (a UI component that silently rewrites a clinical
   score, cross-field errors landing on the wrong field)?

The domain vocabulary you may be asked about:

| Term | Meaning |
| --- | --- |
| MRN | Medical record number, the patient's ID. Format `MRN-` + 6 digits. |
| Barthel Index | 10-item score of how independently someone eats, bathes, climbs stairs. Each item scores in steps of 5, total 0–100. Higher = more independent. That is why 82 is invalid and 80 is fine. |
| Polypharmacy | Being on 5+ regular medicines. Raises interaction risk, so the form forces a pharmacist review once the count hits 5. |
| Age rule | The pathway is for patients 60+, measured **at the assessment date**, not today, because a nurse may enter a backdated visit. |

---

## 2. The file map, in the order the data flows

```
src/features/assessment/
  schema.ts             the rules (given to us, unchanged)
  form-values.ts        the two value shapes + the sample patient
  mobility-options.ts   'wheelchair' -> 'Wheelchair'
  save-assessment.ts    the fake save
  AssessmentForm.tsx    the inputs, the resolver, the success panel
src/pages/Assessment.page.tsx   Container + heading
src/App.tsx                     MantineProvider + the page
```

**Why a `features/assessment/` folder?** The brief asked for the schema at
`src/features/assessment/schema.ts`, which implies feature-first layout: every
file about assessments lives together, and nothing outside the folder imports its
internals except the page.

---

## 3. `schema.ts` — read it, don't change it

Copied verbatim (reformatted only). Two habits worth knowing:

- **Zod 4 syntax.** `{ error: '...' }`, not `{ message: '...' }`. `z.iso.date()`,
  not `z.string().date()`. Old blog examples will not compile. `z.iso.date()`
  validates a `'YYYY-MM-DD'` *string* — which is exactly what Mantine 9's
  `DateInput` emits. No `Date` objects anywhere in this app.
- **The three `.refine()` calls are cross-field rules** and each carries a
  `path`, which is how the polypharmacy error lands on the *checkbox* even though
  it is triggered by the medication *count*.

Two behaviours of Zod that the whole design leans on — worth being able to state:

1. **A failed type check short-circuits the rest of that field's chain.** A blank
   Barthel Index is `''`, fails `z.number()`, and produces exactly one message
   ("Barthel Index score is required") instead of also complaining about `.int()`,
   `.min()` and `.multipleOf()`.
2. **`.refine()` on an object is skipped when the object itself failed.** That is
   why an empty form gives exactly 9 errors and no cross-field noise: the
   refinements never run. (9, not 10, because `pharmacistReviewRequested: false`
   is a perfectly valid boolean.)

I verified all of section 5's fixture rows against the schema before writing any
UI — every rejection landed on the field the brief named, and the three
"must be accepted" rows passed.

---

## 4. The interesting part: two value shapes

`Assessment` (from `z.infer`) describes **valid, submitted** data:
`barthelIndex: number`, `consentObtained: true`, `dateOfBirth: string`.

A form that has just been opened holds none of that: an untouched `DateInput` is
`null`, a cleared `NumberInput` is `''`, an unticked `Checkbox` is `false`. So
`initialValues` cannot be typed as `Assessment`. The brief says explicitly that
how you close this gap is part of what is being assessed, and that hand-writing a
second interface is a red flag.

The answer here is a mapped type, in `form-values.ts`:

```ts
export type AssessmentDraft = {
  [K in keyof Assessment]: Assessment[K] extends boolean ? boolean : Assessment[K] | '' | null;
};
```

Read it as: *same keys as `Assessment`, each value widened by the "not answered
yet" value its input reports.* Booleans stay booleans (that also relaxes
`consentObtained: true` to `boolean`, which a checkbox needs); everything else
gains `''` and `null`. Add a field to the schema and the draft type follows on
its own — there is nothing to keep in sync.

Then in `AssessmentForm.tsx`:

```ts
const form = useForm<AssessmentDraft, Assessment>({
  initialValues: emptyDraft,
  validate: schemaResolver(assessmentSchema, { sync: true }),
  validateInputOnBlur: true,
  transformValues: (values) => assessmentSchema.parse(values),
});
```

`useForm`'s second type parameter is the *transformed* type. Mantine calls
`transformValues` **only on the success path** (I checked the implementation:
`onSubmit` runs `validate()` first and only calls
`handleSubmit(transformValues(values))` when there are no errors), so the
`parse()` there can never throw in practice, and `handleSubmit` receives a real
`Assessment`.

If asked "why parse twice?" — the resolver parses to collect errors, and
`transformValues` parses to produce the output. It is one extra pass over ten
fields on a button click, and it buys a submit handler that is typed and trimmed
with no casting. The alternative (`safeParse` inside the handler and branching on
`success`) re-implements what the resolver already did.

**Where "print what Zod returned, not the raw form state" shows up:** the schema
`.trim()`s `mrn` and `patientName`. Type `"  MRN-004821  "` and the success panel
shows `"MRN-004821"`. That is visible proof the panel is rendering parsed output.

---

## 5. How validation reaches the screen

- `schemaResolver(schema, { sync: true })` turns Zod issues into Mantine's
  `Record<path, message>`, keeping **the first** issue per path — that is what
  guarantees one message per field.
- `sync: true` matters only because our schema has no async checks; it keeps
  `form.validate()` synchronous and the tests simpler. Without it the resolver
  returns a promise and everything still works, just asynchronously.
- `validateInputOnBlur: true` → on blur Mantine runs the resolver over the whole
  object but **extracts only the blurred path's** message. That is exactly why
  untouched fields stay quiet, and also why the polypharmacy error appears when
  you touch the checkbox or submit, rather than while you are still typing the
  medication count.
- `clearInputErrorOnChange` (Mantine's default `true`) clears a field's error as
  soon as the nurse starts fixing it.
- `{...form.getInputProps('field')}` passes `value`, `onChange`, `onBlur` **and
  `error`** into each component, so Mantine's own error rendering puts the message
  under the field. No alert box, no error summary — the brief forbids both.
- Checkboxes need `getInputProps('field', { type: 'checkbox' })`, which supplies
  `checked` instead of `value`. Forget that and the checkbox looks broken.

**Nothing in the JSX knows a single rule.** Search `AssessmentForm.tsx` for a
regex or a `5` used as a threshold and you will not find one. The only numbers in
it are `step`, `min` and `max` props the brief specified, and they are input
affordances, not gates — which brings us to the trap.

---

## 6. The trap, and the one line that avoids it

Mantine's `NumberInput` defaults to `clampBehavior="blur"`: type `105`, tab away,
and the input **rewrites it to `100`**. The nurse's typed value is gone, the
schema never sees it, and the fixture row "barthelIndex: 105 → error on
barthelIndex" can never fire. That is precisely the rubric's red flag: *"a
clinical score silently rounded, clamped, or defaulted instead of rejected. Never
quietly change a number a nurse typed."*

So both `NumberInput`s carry `clampBehavior="none"`. `105` stays `105`, the
schema rejects it with "Barthel Index ranges from 0 to 100", and there is a test
asserting the input still holds `105` after blur. Same reasoning for leaving
decimals enabled: `82.5` should hear "must be a whole number" from the schema
rather than be swallowed by the widget.

`step={5}` is kept because the brief asks for it, and it only affects the
spinner arrows — typing `82` is still possible and still rejected.

---

## 7. Submit, loading, success

```ts
const handleSubmit = async (assessment: Assessment) => {
  await onSave(assessment);
  setSavedAssessment(assessment);
};
```

- `onSave` is a **prop** defaulting to `saveAssessment` (the 800 ms timer). That
  is what makes the required form test possible: pass a `vi.fn()` and assert it
  was called with the parsed values, with no fake timers.
- The button's loading state is `form.submitting`. Mantine sets that flag itself
  and clears it when the promise returned by the handler settles — so there is no
  second piece of state to get out of sync. Mantine's `loading` also blocks
  clicks, and "Load sample patient" is `disabled` while saving.
- `onValuesChange: () => setSavedAssessment(null)` clears the success panel the
  moment anything is edited, so a stale payload never sits under a changed form.
  Setting `null` when it is already `null` is a no-op re-render-wise; React bails
  out on identical state.
- `Load sample patient` = `form.setValues(samplePatient)` + `form.clearErrors()`.
  The fixture is typed `Assessment` (every value is valid), which is also why the
  form test can assert `toHaveBeenCalledWith(samplePatient)` — parsing a fixture
  that is already parsed-shaped returns the same object contents.

---

## 8. The Select, and the "add one value" requirement

The brief wants adding a value to `MOBILITY` to make it appear in the dropdown
with no other edit. So `mobility-options.ts` maps over the array:

```ts
const toLabel = (value: string) => value.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
export const mobilityOptions = MOBILITY.map((value) => ({ value, label: toLabel(value) }));
```

It handles the `home_visit → Home visit` case the brief mentions even though no
current value has an underscore. It lives in its own file so the only regex in
the feature that is *not* a rule is nowhere near the JSX.

---

## 9. Tests — why these

The brief asked for two and cares about "a real boundary", not coverage.

1. **`schema.test.ts`** — 60 years old *on the assessment date* is the boundary
   with an off-by-one on both sides: `1966-08-07` against an assessment date of
   `2026-08-07` passes, `1966-08-08` fails with a single issue on `dateOfBirth`.
   Note the assessment date is hard-coded rather than `today`, because the rule is
   relative to the visit; a test using `today` would drift and would test the
   wrong thing.
2. **`AssessmentForm.test.tsx`** — the round trip: load sample → submit → the
   save handler got the parsed values → success panel appears.

Two extra short ones lock the decisions above, and both are cheap:

3. Empty submit renders exactly the 9 messages **read from the schema itself**
   (`assessmentSchema.safeParse(emptyDraft).error.issues`), so the test cannot
   drift from the rules, plus `expect(messages).toHaveLength(9)` which is the
   brief's own "exactly 9 errors, no cross-field noise" contract.
4. `105` in Barthel Index survives blur and is rejected — the anti-clamping
   guard.

I also ran a temporary smoke check while building (all 10 labels present, blur
shows only the blurred field's error, zero `console.error`/`console.warn` during a
full interaction) and deleted it once the behaviour was locked by the tests above.

---

## 10. Things a reviewer might poke at, and the honest answer

| Question | Answer |
| --- | --- |
| "Why not `mode: 'uncontrolled'`?" | Uncontrolled mode is faster but needs `key={form.key(field)}` on every input for `setValues` to show up. With 10 fields there is no performance problem to solve, and controlled mode keeps "Load sample patient" trivially correct. |
| "Why `parse` in `transformValues` instead of in the submit handler?" | Because Mantine only runs it after validation passes, so it is the one place where "the draft is now valid" is already true. The handler stays about saving. |
| "Is `AssessmentDraft` not just a duplicate interface?" | No — it is mechanically derived from `keyof Assessment`. Add or rename a schema field and it follows. Nothing is restated. |
| "Any `any`?" | None in the app code. `getInputProps` returns loosely-typed props by design in Mantine; nothing is cast or silenced on our side. |
| "Why is `react-router-dom` gone?" | Routing is out of scope for a one-page form; leaving the template's router and demo `Welcome` page in would be dead code. |
| "You changed a lint script." | Only `--allow-empty-input` on stylelint, because deleting the template's demo CSS module left it with zero files to check, which stylelint treats as an error. No rule was disabled and no config deleted. |
| "Why is the consent label the sentence?" | The table gives both a field label ("Consent") and checkbox text; stacking them would repeat itself. Flagged in the README as a judgement call, which the brief explicitly invites. |

---

## 11. Before you send it

- `yarn test` — must be green (it runs typecheck, format check, lint, vitest and
  build). It is green now.
- Set your real figure in the README's **Time spent** section.
- Push to a **public** repo; the commit history is already split into meaningful
  commits rather than one "initial commit".
- Open the app once yourself and click through it: load the sample, submit, watch
  the button spin and the panel appear; then break a field and watch the message
  appear on blur. Being able to describe what you saw is worth more on the call
  than anything in this file.
