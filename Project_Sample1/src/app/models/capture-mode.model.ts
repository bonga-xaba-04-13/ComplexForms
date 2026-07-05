export type CaptureMode = 'single' | 'joint';

export interface Participant {
  id: number;
  label: string;
}

export function resolveParticipants(mode: CaptureMode): Participant[] {
  switch (mode) {
    case 'single':
      return [{ id: 1, label: 'Participant 1' }];
    case 'joint':
      return [
        { id: 1, label: 'Participant 1' },
        { id: 2, label: 'Participant 2' },
      ];
    default:
      return [{ id: 1, label: 'Participant 1' }];
  }
}
