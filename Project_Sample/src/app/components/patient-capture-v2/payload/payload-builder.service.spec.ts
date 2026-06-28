import { PayloadBuilder } from './payload-builder.service';
import { StepSnapshot } from './payload.types';

describe('PayloadBuilder', () => {
  let builder: PayloadBuilder;

  beforeEach(() => {
    builder = new PayloadBuilder();
  });

  describe('buildStepGroupedPayload', () => {
    it('should build Format A payload for single participant (single mode)', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          stepLabel: 'Personal Information',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice', p_lastName: 'Smith' },
          partner: {}
        },
        {
          stepName: 'contact_info',
          stepLabel: 'Contact Details',
          allowDynamicParticipants: false,
          patient: { p_email: 'alice@example.com', p_phone: '123-456-7890' },
          partner: {}
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps);

      expect(payload).toEqual({
        personal_info: [{ p_firstName: 'Alice', p_lastName: 'Smith' }],
        contact_info: [{ p_email: 'alice@example.com', p_phone: '123-456-7890' }]
      });
    });

    it('should build Format A payload for married participants (married mode)', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          patient: { p_firstName: 'Alice', p_lastName: 'Smith' },
          partner: { p_firstName: 'Bob', p_lastName: 'Smith' }
        },
        {
          stepName: 'contact_info',
          allowDynamicParticipants: true,
          patient: { p_email: 'alice@example.com' },
          partner: { p_email: 'bob@example.com' }
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps);

      expect(payload).toEqual({
        personal_info: [
          { p_firstName: 'Alice', p_lastName: 'Smith' },
          { p_firstName: 'Bob', p_lastName: 'Smith' }
        ],
        contact_info: [
          { p_email: 'alice@example.com' },
          { p_email: 'bob@example.com' }
        ]
      });
    });

    it('should handle mixed steps (some single, some married)', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          patient: { p_firstName: 'Alice' },
          partner: { p_firstName: 'Bob' }
        },
        {
          stepName: 'employment',
          allowDynamicParticipants: false,
          patient: { occupation: 'Engineer' },
          partner: {}
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps);

      expect(payload.personal_info).toHaveLength(2);
      expect(payload.employment).toHaveLength(1);
    });

    it('should omit empty fields when omitEmpty=true', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice', p_middleName: '', p_notes: null },
          partner: {}
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps, { omitEmpty: true });

      expect(payload.personal_info[0]).toEqual({ p_firstName: 'Alice' });
      expect(payload.personal_info[0]).not.toHaveProperty('p_middleName');
      expect(payload.personal_info[0]).not.toHaveProperty('p_notes');
    });

    it('should include all fields (even empty) when omitEmpty=false', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice', p_middleName: '', p_notes: null },
          partner: {}
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps, { omitEmpty: false });

      expect(payload.personal_info[0]).toHaveProperty('p_firstName');
      expect(payload.personal_info[0]).toHaveProperty('p_middleName');
      expect(payload.personal_info[0]).toHaveProperty('p_notes');
    });

    it('should not include partner if step allows it but partner data is empty', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          patient: { p_firstName: 'Alice' },
          partner: {} // Empty
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps);

      expect(payload.personal_info).toHaveLength(1);
      expect(payload.personal_info[0]).toEqual({ p_firstName: 'Alice' });
    });
  });

  describe('buildParticipantPayload', () => {
    it('should build Format B payload for single participant', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          stepLabel: 'Personal Information',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice' },
          partner: {}
        }
      ];

      const payload = builder.buildParticipantPayload(steps, {
        now: () => '2026-06-28T12:00:00Z'
      });

      expect(payload.captureMode).toBe('single');
      expect(payload.capturedAt).toBe('2026-06-28T12:00:00Z');
      expect(payload.participants).toHaveLength(1);
      expect(payload.participants[0].role).toBe('patient');
      expect(payload.participants[0].steps).toHaveLength(1);
      expect(payload.participants[0].steps[0]).toEqual({
        stepName: 'personal_info',
        stepLabel: 'Personal Information',
        values: { p_firstName: 'Alice' }
      });
    });

    it('should build Format B payload for married participants', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          patient: { p_firstName: 'Alice' },
          partner: { p_firstName: 'Bob' }
        }
      ];

      const payload = builder.buildParticipantPayload(steps, {
        now: () => '2026-06-28T12:00:00Z'
      });

      expect(payload.captureMode).toBe('married');
      expect(payload.participants).toHaveLength(2);
      expect(payload.participants[0].role).toBe('patient');
      expect(payload.participants[1].role).toBe('partner');
    });

    it('should determine captureMode=single when no partner data anywhere', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          patient: { p_firstName: 'Alice' },
          partner: {} // Empty
        },
        {
          stepName: 'contact_info',
          allowDynamicParticipants: true,
          patient: { p_email: 'alice@example.com' },
          partner: {} // Empty
        }
      ];

      const payload = builder.buildParticipantPayload(steps);

      expect(payload.captureMode).toBe('single');
      expect(payload.participants).toHaveLength(1);
    });

    it('should determine captureMode=married when any partner data exists', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          patient: { p_firstName: 'Alice' },
          partner: {} // Empty
        },
        {
          stepName: 'contact_info',
          allowDynamicParticipants: true,
          patient: { p_email: 'alice@example.com' },
          partner: { p_email: 'bob@example.com' } // Has data
        }
      ];

      const payload = builder.buildParticipantPayload(steps);

      expect(payload.captureMode).toBe('married');
      expect(payload.participants).toHaveLength(2);
    });

    it('should use current timestamp when now() not provided', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          patient: {},
          partner: {}
        }
      ];

      const before = new Date();
      const payload = builder.buildParticipantPayload(steps);
      const after = new Date();

      const capturedTime = new Date(payload.capturedAt);
      expect(capturedTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(capturedTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should omit stepLabel when not provided', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice' },
          partner: {}
        }
      ];

      const payload = builder.buildParticipantPayload(steps);

      expect(payload.participants[0].steps[0]).not.toHaveProperty('stepLabel');
    });

    it('should include stepLabel when provided', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          stepLabel: 'Personal Information',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice' },
          partner: {}
        }
      ];

      const payload = builder.buildParticipantPayload(steps);

      expect(payload.participants[0].steps[0].stepLabel).toBe('Personal Information');
    });

    it('should omit empty fields when omitEmpty=true', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice', p_middleName: '', notes: null },
          partner: {}
        }
      ];

      const payload = builder.buildParticipantPayload(steps, { omitEmpty: true });

      expect(payload.participants[0].steps[0].values).toEqual({ p_firstName: 'Alice' });
    });
  });

  describe('edge cases', () => {
    it('should handle empty steps array', () => {
      const payload = builder.buildStepGroupedPayload([]);
      expect(payload).toEqual({});

      const payload2 = builder.buildParticipantPayload([]);
      expect(payload2.participants).toHaveLength(1);
      expect(payload2.participants[0].steps).toHaveLength(0);
    });

    it('should handle arrays and complex objects in omitEmpty filtering', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          patient: {
            p_firstName: 'Alice',
            tags: [],
            emptyObj: {},
            filledList: [1, 2, 3]
          },
          partner: {}
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps, { omitEmpty: true });

      expect(payload.personal_info[0]).not.toHaveProperty('tags'); // Empty array
      expect(payload.personal_info[0]).not.toHaveProperty('emptyObj'); // Empty object
      expect(payload.personal_info[0]).toHaveProperty('filledList'); // Non-empty array
    });

    it('should handle steps with only partner data (unlikely but defensible)', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'contact_info',
          allowDynamicParticipants: true,
          patient: {}, // Empty patient
          partner: { p_email: 'bob@example.com' }
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps);

      // Should still produce array (even with empty patient object)
      expect(payload.contact_info).toHaveLength(2);
      expect(payload.contact_info[0]).toEqual({});
      expect(payload.contact_info[1]).toEqual({ p_email: 'bob@example.com' });
    });
  });

  describe('immutability', () => {
    it('should not mutate input steps', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice' },
          partner: {}
        }
      ];

      const originalPatient = { ...steps[0].patient };
      builder.buildStepGroupedPayload(steps);

      expect(steps[0].patient).toEqual(originalPatient);
    });

    it('should not return references to input objects', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice' },
          partner: {}
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps);

      payload.personal_info[0].p_firstName = 'Bob';
      expect(steps[0].patient.p_firstName).toBe('Alice');
    });
  });

  describe('determinism', () => {
    it('should produce identical output for identical input', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice', p_lastName: 'Smith' },
          partner: {}
        }
      ];

      const now = '2026-06-28T12:00:00Z';
      const payload1 = builder.buildParticipantPayload(steps, { now: () => now });
      const payload2 = builder.buildParticipantPayload(steps, { now: () => now });

      expect(payload1).toEqual(payload2);
    });
  });
});
