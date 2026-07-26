import type { PlatformAnnouncement } from '@/types/models';

/** Human-readable, one-line summary of who an announcement was sent to. */
export function audienceSummary(a: Pick<PlatformAnnouncement, 'audience' | 'targetPlan' | 'targetState' | 'targetBoard' | 'targetSchoolIds'>): string {
  switch (a.audience) {
    case 'plan':
      return a.targetPlan ? `Plan: ${a.targetPlan}` : 'By plan';
    case 'state':
      return a.targetState ? `State: ${a.targetState}` : 'By state';
    case 'board':
      return a.targetBoard ? `Board: ${a.targetBoard}` : 'By board';
    case 'schools': {
      const n = a.targetSchoolIds?.length ?? 0;
      return `${n} school${n === 1 ? '' : 's'}`;
    }
    case 'all':
    default:
      return 'All schools';
  }
}

const CHANNEL_LABELS: Record<string, string> = { in_app: 'In-app', email: 'Email', sms: 'SMS' };

/** Map stored channel keys to friendly labels (unknown keys pass through). */
export function channelLabels(channels?: string[]): string[] {
  if (!channels || channels.length === 0) return ['In-app'];
  return channels.map((c) => CHANNEL_LABELS[c] ?? c);
}
