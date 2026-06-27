# Prompt: Transform a Single Capture Flow into a Joint (Dual-Person) Capture Flow

Use this as a feature-request prompt for an AI coding assistant working on an
existing application that currently only supports capturing details for a
**single person/entity** through a multi-step form, and you want to add a
**second, parallel flow** that captures the **same set of steps for two
people in one session** (e.g. a married couple, joint account holders, two
co-applicants, etc.).

---

## Context to Give the AI

> "This application has an existing multi-step capture flow for a single
> person. It works as follows: a top-level configuration defines an ordered
> list of steps, each step points to a field-definition file describing the
> inputs to render (label, type, validation rules, options). A capture
> component loads the step list, fetches each step's field definitions,
> builds a reactive form group per step, and a step-renderer component
> displays the active step's fields with validation. Navigation buttons move
> between steps, and a final submit collects the combined form value.
>
> I want to add a new 'Joint Capture' flow that reuses the exact same step
> list and field definitions, but on **every step renders the fields twice —
> once for 'Person 1' and once for 'Person 2'** — so both people's data is
> captured side-by-side (or stacked) before moving to the next step. At the
> end, submit produces one payload containing both people's answers for every
> step."

---

## Requirements to Specify

1. **Reuse, don't duplicate, field definitions.** The same per-step field
   definition files (forms/JSON/schema) used by the single-capture flow must
   be reused unchanged for both people — do not create person-specific copies
   of field definitions.

2. **New top-level step configuration.** Create a new multi-step
   configuration file (mirroring the existing single-capture one) that lists
   the same steps in the same order, pointing at the same field-definition
   files. This is the only new "data" file needed.

3. **New capture component (clone of the existing one).** Create a sibling
   component to the existing single-capture component. The only behavioral
   difference: when building the reactive form for each step, instead of
   building one flat group of controls, build **one group containing two
   nested sub-groups** (e.g. `person1` / `person2`), each populated with the
   same controls/validators derived from that step's field definitions.

4. **New step-renderer component (clone of the existing one).** Create a
   sibling renderer component that, for the active step, renders the field
   list **twice** — once bound to the `person1` sub-group, once bound to the
   `person2` sub-group — each under its own clearly labeled section (e.g. "
   Person 1" / "Person 2"). Preserve all existing per-field behavior:
   required-field indicators, validation/error messages, field types
   (text/select/date/checkbox/radio/textarea), and option lists.

5. **Avoid DOM id collisions.** Since the same field list is rendered twice
   on one page, every element `id`/`for` pair must be made unique by
   prefixing with the person key (e.g. `person1_<fieldName>`,
   `person2_<fieldName>`), so labels remain correctly associated with inputs
   and accessibility is preserved.

6. **Validation stays independent per person.** Each person's sub-group
   validates independently — a required field left blank for Person 2 should
   not block Person 1's section from showing as valid, and vice versa.
   Touch/error state must be tracked per `person` + field name.

7. **Resulting submit payload shape.** The combined form value should be
   structured as:
   ```
   {
     <stepId1>: { person1: { ...fields }, person2: { ...fields } },
     <stepId2>: { person1: { ...fields }, person2: { ...fields } },
     ...
   }
   ```

8. **New entry point.** Add a new launcher (button/menu item/route) on
   whatever screen currently launches the single-capture flow, opening the
   new joint-capture component with the new step configuration. Do **not**
   modify or remove the existing single-capture entry point — both flows
   must continue to work side-by-side.

9. **Layout choice.** Specify whether the two people's sections should be
   shown **stacked** (Person 1's full form, then Person 2's full form below
   it) or **side-by-side** (two columns). Stacked is simpler and more
   responsive on narrow screens; side-by-side is more compact on wide
   screens.

10. **Scrolling/viewport.** Because each step now renders twice as much
    content, ensure the form area is independently scrollable within a
    fixed-height container so navigation buttons (Previous/Next/Submit)
    remain visible/pinned regardless of form length. If the existing modal/
    dialog/page doesn't already constrain its height, this may need a small
    layout fix (constrain the container to a fixed height, make the form
    section `overflow: auto`).

11. **No changes to shared interfaces/types** that describe field
    definitions, steps, or step configurations — the joint flow should
    consume the exact same shapes as the single flow. Only the
    capture-component and step-renderer-component need new (cloned)
    implementations, plus the one new step-configuration file and the new
    entry point wiring.

---

## Naming Conventions to Suggest

- New step configuration file: `joint_<existing-config-name>` (e.g.
  `joint_patient.json` for `single_patient.json` / `patient.json`).
- New capture component: `<EntityName>JointCapture` (e.g. `Jointcapture`).
- New step-renderer component: `Joint<ExistingRendererName>` (e.g.
  `JointStepForm` for `StepForm`).
- Person sub-group keys: short, generic (`person1`/`person2` or
  `user1`/`user2`) unless the domain has clearer names (`patient`/`partner`,
  `applicant`/`coApplicant`, etc.) — confirm naming with the requester before
  implementing, since it affects the submit payload shape.

---

## Verification Checklist for the AI to Run

- [ ] Project builds with no new type/compile errors.
- [ ] New entry point opens the joint capture flow without affecting the
      existing single capture flow.
- [ ] Each step renders both people's full field sets with correct labels,
      types, options, and required indicators.
- [ ] Filling/validating one person's fields does not affect the other
      person's validation state.
- [ ] No duplicate DOM `id` attributes (check both person sections on the
      same step).
- [ ] Long steps (many fields, both people) scroll within the form area
      while navigation buttons remain visible.
- [ ] Submitting on the final step produces a payload with both people's
      data nested per step, in the agreed shape.
