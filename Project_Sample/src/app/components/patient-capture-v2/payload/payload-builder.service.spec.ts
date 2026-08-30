import { PayloadBuilder } from './payload-builder.service';
import { StepSnapshot } from './payload.types';

describe('PayloadBuilder', () => {
  let builder: PayloadBuilder;

  beforeEach(() => {
    builder = new PayloadBuilder();
  });

  describe('buildStepGroupedPayload', () => {
    it('should build Format A payload for single participant (individual mode)', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          stepLabel: 'Personal Information',
          allowDynamicParticipants: false,
          participants: { 0: { p_firstName: 'Alice', p_lastName: 'Smith' } }
        },
        {
          stepName: 'contact_info',
          stepLabel: 'Contact Details',
          allowDynamicParticipants: false,
          participants: { 0: { p_email: 'alice@example.com', p_phone: '123-456-7890' } }
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps);

      expect(payload).toEqual({
        personal_info: [{ p_firstName: 'Alice', p_lastName: 'Smith' }],
        contact_info: [{ p_email: 'alice@example.com', p_phone: '123-456-7890' }]
      });
    });

    it('should build Format A payload for joint capture (multiple participants)', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          participants: { 0: { p_firstName: 'Alice', p_lastName: 'Smith' }, 1: { p_firstName: 'Bob', p_lastName: 'Smith' } }
        },
        {
          stepName: 'contact_info',
          allowDynamicParticipants: true,
          participants: { 0: { p_email: 'alice@example.com' }, 1: { p_email: 'bob@example.com' } }
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

    it('should handle mixed steps (some with multiple participants, some without)', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          participants: { 0: { p_firstName: 'Alice' }, 1: { p_firstName: 'Bob' } }
        },
        {
          stepName: 'employment',
          allowDynamicParticipants: false,
          participants: { 0: { occupation: 'Engineer' } }
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
          participants: { 0: { p_firstName: 'Alice', p_middleName: '', p_notes: null } }
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
          participants: { 0: { p_firstName: 'Alice', p_middleName: '', p_notes: null } }
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps, { omitEmpty: false });

      expect(payload.personal_info[0]).toHaveProperty('p_firstName');
      expect(payload.personal_info[0]).toHaveProperty('p_middleName');
      expect(payload.personal_info[0]).toHaveProperty('p_notes');
    });

    it('should not include participant 1 if no data provided', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          participants: { 0: { p_firstName: 'Alice' } }
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps);

      expect(payload.personal_info).toHaveLength(1);
      expect(payload.personal_info[0]).toEqual({ p_firstName: 'Alice' });
    });
  });

  describe('buildParticipantPayload', () => {
    it('should build Format B payload for individual participant', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          stepLabel: 'Personal Information',
          allowDynamicParticipants: false,
          participants: { 0: { p_firstName: 'Alice' } }
        }
      ];

      const payload = builder.buildParticipantPayload(steps, {
        now: () => '2026-06-28T12:00:00Z'
      });

      expect(payload.captureMode).toBe('individual');
      expect(payload.capturedAt).toBe('2026-06-28T12:00:00Z');
      expect(payload.participants).toHaveLength(1);
      expect(payload.participants[0].participantIndex).toBe(0);
      expect(payload.participants[0].steps).toHaveLength(1);
      expect(payload.participants[0].steps[0]).toEqual({
        stepName: 'personal_info',
        stepLabel: 'Personal Information',
        values: { p_firstName: 'Alice' }
      });
    });

    it('should build Format B payload for joint capture', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          participants: { 0: { p_firstName: 'Alice' }, 1: { p_firstName: 'Bob' } }
        }
      ];

      const payload = builder.buildParticipantPayload(steps, {
        now: () => '2026-06-28T12:00:00Z'
      });

      expect(payload.captureMode).toBe('joint');
      expect(payload.participants).toHaveLength(2);
      expect(payload.participants[0].participantIndex).toBe(0);
      expect(payload.participants[1].participantIndex).toBe(1);
    });

    it('should determine captureMode=individual when no second participant data exists', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          participants: { 0: { p_firstName: 'Alice' } }
        },
        {
          stepName: 'contact_info',
          allowDynamicParticipants: true,
          participants: { 0: { p_email: 'alice@example.com' } }
        }
      ];

      const payload = builder.buildParticipantPayload(steps);

      expect(payload.captureMode).toBe('individual');
      expect(payload.participants).toHaveLength(1);
    });

    it('should determine captureMode=joint when any second participant data exists', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          participants: { 0: { p_firstName: 'Alice' } }
        },
        {
          stepName: 'contact_info',
          allowDynamicParticipants: true,
          participants: { 0: { p_email: 'alice@example.com' }, 1: { p_email: 'bob@example.com' } }
        }
      ];

      const payload = builder.buildParticipantPayload(steps);

      expect(payload.captureMode).toBe('joint');
      expect(payload.participants).toHaveLength(2);
    });

    it('should use current timestamp when now() not provided', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          participants: { 0: {} }
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
          participants: { 0: { p_firstName: 'Alice' } }
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
          participants: { 0: { p_firstName: 'Alice' } }
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
          participants: { 0: { p_firstName: 'Alice', p_middleName: '', notes: null } }
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
      // With no steps, maxIndex is 0 so we still get one participant section
      expect(payload2.participants).toHaveLength(1);
      expect(payload2.participants[0].steps).toHaveLength(0);
    });

    it('should handle arrays and complex objects in omitEmpty filtering', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          participants: {
            0: {
              p_firstName: 'Alice',
              tags: [],
              emptyObj: {},
              filledList: [1, 2, 3]
            }
          }
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps, { omitEmpty: true });

      expect(payload.personal_info[0]).not.toHaveProperty('tags');
      expect(payload.personal_info[0]).not.toHaveProperty('emptyObj');
      expect(payload.personal_info[0]).toHaveProperty('filledList');
    });

    it('should handle steps with only participant 1 data (unusual but defensible)', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'contact_info',
          allowDynamicParticipants: true,
          participants: { 1: { p_email: 'bob@example.com' } }
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps);

      expect(payload.contact_info).toHaveLength(1);
      expect(payload.contact_info[0]).toEqual({ p_email: 'bob@example.com' });
    });
  });

  describe('immutability', () => {
    it('should not mutate input steps', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          participants: { 0: { p_firstName: 'Alice' } }
        }
      ];

      const originalP0 = { ...steps[0].participants[0] };
      builder.buildStepGroupedPayload(steps);

      expect(steps[0].participants[0]).toEqual(originalP0);
    });

    it('should not return references to input objects', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          participants: { 0: { p_firstName: 'Alice' } }
        }
      ];

      const payload = builder.buildStepGroupedPayload(steps);

      payload.personal_info[0].p_firstName = 'Bob';
      expect(steps[0].participants[0].p_firstName).toBe('Alice');
    });
  });

  describe('determinism', () => {
    it('should produce identical output for identical input', () => {
      const steps: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: false,
          participants: { 0: { p_firstName: 'Alice', p_lastName: 'Smith' } }
        }
      ];

      const now = '2026-06-28T12:00:00Z';
      const payload1 = builder.buildParticipantPayload(steps, { now: () => now });
      const payload2 = builder.buildParticipantPayload(steps, { now: () => now });

      expect(payload1).toEqual(payload2);
    });
  });
});
