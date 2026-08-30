import { FormControl, FormGroup } from '@angular/forms';
import { FormPatchService } from './form-patch.service';
import { ParticipantPayload, StepGroupedPayload, StepSnapshot } from '../payload/payload.types';

describe('FormPatchService', () => {
  let service: FormPatchService;

  /** Build a FormGroup matching the fields of a loaded step definition. */
  function makeGroup(definition: { name: string }[]): FormGroup {
    const controls: Record<string, FormControl> = {};
    definition.forEach(c => { controls[c.name] = new FormControl(''); });
    return new FormGroup(controls);
  }

  /** Two loaded steps → two FormGroups for each participant. */
  function makeForms(participantKeys: number[]): Record<number, FormGroup[]> {
    const steps = [
      {name: 'p_firstName'}, {name: 'p_lastName'}
    ];
    const forms: Record<number, FormGroup[]> = {};
    participantKeys.forEach(i => {
      forms[i] = [makeGroup(steps), makeGroup(steps)];
    });
    return forms;
  }

  const stepMeta = [
    { keyname: 'personal_info', formLabel: 'Personal Information' },
    { keyname: 'contact_info', formLabel: 'Contact Details' },
  ];

  beforeEach(() => {
    service = new FormPatchService();
  });

  it('patches every group for participant 0 from StepSnapshot[] (draft shape)', () => {
    const forms = makeForms([0]);
    const data: StepSnapshot[] = [
      {
        stepName: 'personal_info',
        stepLabel: 'Personal Information',
        allowDynamicParticipants: false,
        participants: { 0: { p_firstName: 'Alice' } },
      },
      {
        stepName: 'contact_info',
        stepLabel: 'Contact Details',
        allowDynamicParticipants: false,
        participants: { 0: { p_firstName: 'Smith' } },
      },
    ];

    service.patch(forms, data, stepMeta);

    expect(forms[0][0].value).toEqual({ p_firstName: 'Alice', p_lastName: '' });
    expect(forms[0][1].value).toEqual({ p_firstName: 'Smith', p_lastName: '' });
  });

  it('patches all participants when the data mentions indexes 0 and 1', () => {
    const forms = makeForms([0, 1]);
    const data: StepSnapshot[] = [
      {
        stepName: 'personal_info',
        allowDynamicParticipants: true,
        participants: {
          0: { p_firstName: 'Alice', p_lastName: 'Smith' },
          1: { p_firstName: 'Bob', p_lastName: 'Smith' },
        },
      },
    ];

    service.patch(forms, data, stepMeta);

    expect(forms[0][0].value).toEqual({ p_firstName: 'Alice', p_lastName: 'Smith' });
    expect(forms[1][0].value).toEqual({ p_firstName: 'Bob', p_lastName: 'Smith' });
  });

  it('patches from StepGroupedPayload (Format A, backend shape)', () => {
    const forms = makeForms([0, 1]);
    const data: StepGroupedPayload = {
      personal_info: [
        { p_firstName: 'Alice', p_lastName: 'Smith' },
        { p_firstName: 'Bob', p_lastName: 'Smith' },
      ],
      contact_info: [{ p_firstName: 'Alice', p_lastName: 'Smith' }],
    };

    service.patch(forms, data, stepMeta);

    expect(forms[0][0].value).toEqual({ p_firstName: 'Alice', p_lastName: 'Smith' });
    expect(forms[1][0].value).toEqual({ p_firstName: 'Bob', p_lastName: 'Smith' });
    // contact_info only carries one element → participant 1 gets no values.
    expect(forms[1][1].value).toEqual({ p_firstName: '', p_lastName: '' });
  });

  it('patches from ParticipantPayload (Format B, audit shape)', () => {
    const forms = makeForms([0, 1]);
    const data: ParticipantPayload = {
      captureMode: 'joint',
      capturedAt: '2026-08-30T00:00:00.000Z',
      participants: [
        {
          participantIndex: 0,
          steps: [
            { stepName: 'personal_info', stepLabel: 'Personal Information', values: { p_firstName: 'Alice' } },
            { stepName: 'contact_info', stepLabel: 'Contact Details', values: { p_lastName: 'Smith' } },
          ],
        },
        {
          participantIndex: 1,
          steps: [
            { stepName: 'personal_info', values: { p_firstName: 'Bob' } },
          ],
        },
      ],
    };

    service.patch(forms, data, stepMeta);

    expect(forms[0][0].value).toEqual({ p_firstName: 'Alice', p_lastName: '' });
    expect(forms[0][1].value).toEqual({ p_firstName: '', p_lastName: 'Smith' });
    expect(forms[1][0].value).toEqual({ p_firstName: 'Bob', p_lastName: '' });
  });

  it('falls back to positional order when stepMeta has no match', () => {
    const forms = makeForms([0]);
    const data: StepSnapshot[] = [
      {
        stepName: 'unknown_step_a',
        allowDynamicParticipants: false,
        participants: { 0: { p_firstName: 'A' } },
      },
      {
        stepName: 'unknown_step_b',
        allowDynamicParticipants: false,
        participants: { 0: { p_firstName: 'B' } },
      },
    ];

    // Empty stepMeta → data position must drive the mapping.
    service.patch(forms, data);

    expect(forms[0][0].value).toEqual({ p_firstName: 'A', p_lastName: '' });
    expect(forms[0][1].value).toEqual({ p_firstName: 'B', p_lastName: '' });
  });

  it('ignores fields the FormGroup does not have (patchValue tolerance)', () => {
    const forms = makeForms([0]);
    const data: StepSnapshot[] = [
      {
        stepName: 'personal_info',
        allowDynamicParticipants: false,
        participants: { 0: { p_firstName: 'Alice', onlyOnServer: 'x' } },
      },
    ];

    service.patch(forms, data, stepMeta);

    expect(forms[0][0].value).toEqual({ p_firstName: 'Alice', p_lastName: '' });
  });

  it('is a safe no-op when a referenced participant has no built forms', () => {
    const forms = makeForms([0]); // participant 1 intentionally absent
    const data: StepSnapshot[] = [
      {
        stepName: 'personal_info',
        allowDynamicParticipants: true,
        participants: { 0: { p_firstName: 'Alice' }, 1: { p_firstName: 'Bob' } },
      },
    ];

    expect(() => service.patch(forms, data, stepMeta)).not.toThrow();
    expect(forms[0][0].value).toEqual({ p_firstName: 'Alice', p_lastName: '' });
  });

  it('builds missing participant forms on demand via the factory', () => {
    const forms = makeForms([0]);
    const data: StepSnapshot[] = [
      {
        stepName: 'personal_info',
        allowDynamicParticipants: true,
        participants: { 1: { p_firstName: 'Bob', p_lastName: 'Smith' } },
      },
    ];
    const builtIndexes: number[] = [];
    const factory = (index: number) => { builtIndexes.push(index); return makeForms([index])[index]; };

    service.patch(forms, data, stepMeta, factory);

    expect(builtIndexes).toEqual([1]);
    expect(forms[1][0].value).toEqual({ p_firstName: 'Bob', p_lastName: 'Smith' });
  });
});