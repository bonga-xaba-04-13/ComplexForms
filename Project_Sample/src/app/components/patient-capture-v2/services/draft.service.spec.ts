import { DraftService } from './draft.service';
import { PayloadBuilder } from '../payload/payload-builder.service';
import { DraftData, StepSnapshot } from '../payload/payload.types';

describe('DraftService', () => {
  let service: DraftService;
  let payloadBuilder: PayloadBuilder;

  beforeEach(() => {
    payloadBuilder = new PayloadBuilder();
    service = new DraftService(payloadBuilder);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveDraft', () => {
    it('should save draft with both formats to localStorage', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          stepLabel: 'Personal Information',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice', p_lastName: 'Smith' },
          partner: {}
        }
      ];

      const metadata = {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 1
      };

      service.saveDraft(snapshots, 'single', metadata);

      const stored = localStorage.getItem('patient_capture_draft');
      expect(stored).toBeTruthy();

      const draft = JSON.parse(stored!) as DraftData;
      expect(draft.captureMode).toBe('single');
      expect(draft.metadata.currentStep).toBe(0);
      expect(draft.formatA).toBeDefined();
      expect(draft.formatB).toBeDefined();
      expect(draft.schemaVersion).toBe(1);
    });

    it('should save draft with married mode', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          patient: { p_firstName: 'Alice' },
          partner: { p_firstName: 'Bob' }
        }
      ];

      const metadata = {
        currentStep: 1,
        completedSteps: [0],
        totalSteps: 2
      };

      service.saveDraft(snapshots, 'married', metadata);

      const draft = service.getDraft();
      expect(draft?.captureMode).toBe('married');
      expect(draft?.metadata.completedSteps).toEqual([0]);
    });

    it('should include timestamp in saved draft', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: {},
          partner: {}
        }
      ];

      const before = new Date();
      service.saveDraft(snapshots, 'single', {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 1
      });
      const after = new Date();

      const draft = service.getDraft();
      const savedTime = new Date(draft!.savedAt);

      expect(savedTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(savedTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should overwrite previous draft', () => {
      const snapshots1: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: { value: 'first' },
          partner: {}
        }
      ];

      const snapshots2: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: { value: 'second' },
          partner: {}
        }
      ];

      const meta = {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 1
      };

      service.saveDraft(snapshots1, 'single', meta);
      service.saveDraft(snapshots2, 'single', meta);

      const draft = service.getDraft();
      expect(draft?.formatA.test[0].value).toBe('second');
    });

    it('should throw error if quota exceeded and cannot retry', () => {
      // Mock localStorage.setItem to always throw quota error
      spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
      spyOn(localStorage, 'removeItem');

      const snapshots: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: { data: 'x'.repeat(10000) },
          partner: {}
        }
      ];

      const meta = {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 1
      };

      expect(() => {
        service.saveDraft(snapshots, 'single', meta);
      }).toThrowError('quota exceeded');
    });
  });

  describe('getDraft', () => {
    it('should return null if no draft exists', () => {
      expect(service.getDraft()).toBeNull();
    });

    it('should return null if draft JSON is corrupted', () => {
      localStorage.setItem('patient_capture_draft', '{invalid json');
      expect(service.getDraft()).toBeNull();
    });

    it('should return null if schema version mismatches', () => {
      const draft: DraftData = {
        savedAt: new Date().toISOString(),
        captureMode: 'single',
        formatA: {},
        formatB: {
          captureMode: 'single',
          capturedAt: '',
          participants: []
        },
        metadata: { currentStep: 0, completedSteps: [], totalSteps: 1 },
        schemaVersion: 999 // Mismatch
      };

      localStorage.setItem('patient_capture_draft', JSON.stringify(draft));
      expect(service.getDraft()).toBeNull();
    });

    it('should return valid draft', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: { key: 'value' },
          partner: {}
        }
      ];

      const meta = {
        currentStep: 1,
        completedSteps: [0],
        totalSteps: 2
      };

      service.saveDraft(snapshots, 'single', meta);
      const draft = service.getDraft();

      expect(draft).toBeTruthy();
      expect(draft?.metadata.currentStep).toBe(1);
      expect(draft?.metadata.completedSteps).toEqual([0]);
    });
  });

  describe('hasDraft', () => {
    it('should return false when no draft exists', () => {
      expect(service.hasDraft()).toBeFalsy();
    });

    it('should return true when valid draft exists', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: {},
          partner: {}
        }
      ];

      service.saveDraft(snapshots, 'single', {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 1
      });

      expect(service.hasDraft()).toBeTruthy();
    });

    it('should return false when draft is corrupted', () => {
      localStorage.setItem('patient_capture_draft', 'invalid');
      expect(service.hasDraft()).toBeFalsy();
    });
  });

  describe('restoreDraft', () => {
    it('should return null if no draft exists', () => {
      expect(service.restoreDraft()).toBeNull();
    });

    it('should return restore context with snapshots and metadata', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          stepLabel: 'Personal Information',
          allowDynamicParticipants: false,
          patient: { p_firstName: 'Alice' },
          partner: {}
        }
      ];

      const metadata = {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 1
      };

      service.saveDraft(snapshots, 'single', metadata);
      const context = service.restoreDraft();

      expect(context).toBeTruthy();
      expect(context?.captureMode).toBe('single');
      expect(context?.currentStep).toBe(0);
      expect(context?.completedSteps).toEqual([]);
      expect(context?.snapshots).toHaveLength(1);
      expect(context?.snapshots[0].patient.p_firstName).toBe('Alice');
    });

    it('should restore married mode snapshot', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'personal_info',
          allowDynamicParticipants: true,
          patient: { p_firstName: 'Alice' },
          partner: { p_firstName: 'Bob' }
        }
      ];

      service.saveDraft(snapshots, 'married', {
        currentStep: 1,
        completedSteps: [0],
        totalSteps: 2
      });

      const context = service.restoreDraft();

      expect(context?.captureMode).toBe('married');
      expect(context?.snapshots[0].partner.p_firstName).toBe('Bob');
    });
  });

  describe('clearDraft', () => {
    it('should remove draft from localStorage', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: {},
          partner: {}
        }
      ];

      service.saveDraft(snapshots, 'single', {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 1
      });

      expect(service.hasDraft()).toBeTruthy();

      service.clearDraft();

      expect(service.hasDraft()).toBeFalsy();
    });

    it('should not throw error if no draft exists', () => {
      expect(() => {
        service.clearDraft();
      }).not.toThrow();
    });
  });

  describe('getDraftSize', () => {
    it('should return null if no draft exists', () => {
      expect(service.getDraftSize()).toBeNull();
    });

    it('should return size information for saved draft', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: { data: 'x'.repeat(1000) },
          partner: {}
        }
      ];

      service.saveDraft(snapshots, 'single', {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 1
      });

      const sizeInfo = service.getDraftSize();

      expect(sizeInfo).toBeTruthy();
      expect(sizeInfo?.bytes).toBeGreaterThan(0);
      expect(sizeInfo?.percentOfQuota).toBeGreaterThan(0);
      expect(sizeInfo?.quotaLimit).toBeGreaterThan(0);
    });

    it('should calculate reasonable percentage of quota', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: { small: 'data' },
          partner: {}
        }
      ];

      service.saveDraft(snapshots, 'single', {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 1
      });

      const sizeInfo = service.getDraftSize();

      // Small draft should be less than 0.1% of 5MB quota
      expect(sizeInfo?.percentOfQuota).toBeLessThan(0.1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty snapshots array', () => {
      const meta = {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 0
      };

      service.saveDraft([], 'single', meta);

      const draft = service.getDraft();
      expect(draft).toBeTruthy();
      expect(draft?.metadata.totalSteps).toBe(0);
    });

    it('should preserve special characters in field values', () => {
      const snapshots: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: { text: 'Special: "quotes" & <tags> é' },
          partner: {}
        }
      ];

      service.saveDraft(snapshots, 'single', {
        currentStep: 0,
        completedSteps: [],
        totalSteps: 1
      });

      const context = service.restoreDraft();
      expect(context?.snapshots[0].patient.text).toBe(
        'Special: "quotes" & <tags> é'
      );
    });

    it('should handle multiple completed steps', () => {
      const meta = {
        currentStep: 5,
        completedSteps: [0, 1, 2, 3, 4],
        totalSteps: 7
      };

      const snapshots: StepSnapshot[] = [
        {
          stepName: 'test',
          allowDynamicParticipants: false,
          patient: {},
          partner: {}
        }
      ];

      service.saveDraft(snapshots, 'single', meta);

      const context = service.restoreDraft();
      expect(context?.completedSteps).toEqual([0, 1, 2, 3, 4]);
      expect(context?.currentStep).toBe(5);
    });
  });
});
