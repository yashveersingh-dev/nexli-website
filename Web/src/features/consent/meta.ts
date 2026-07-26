import type { IconName } from '@/components/Icon';
import type { ConsentState } from '@/types/compliance';

/** Starter catalog offered on the empty state — common K-12 data-processing purposes. */
export interface StarterPurpose {
  name: string;
  description: string;
  required: boolean;
  dataCategories: string[];
}

export const STARTER_PURPOSES: StarterPurpose[] = [
  {
    name: 'Academic records',
    description: 'Maintaining marks, report cards, attendance and progress for the student.',
    required: true,
    dataCategories: ['Name', 'Roll number', 'Marks', 'Attendance'],
  },
  {
    name: 'Photographs & media',
    description: 'Using student photos/video in the yearbook, website, social media and events.',
    required: false,
    dataCategories: ['Photographs', 'Video'],
  },
  {
    name: 'Health & emergency',
    description: 'Storing medical/allergy info and contacting guardians in an emergency.',
    required: true,
    dataCategories: ['Medical notes', 'Allergies', 'Emergency contact'],
  },
  {
    name: 'Transport tracking',
    description: 'Sharing live bus location and stop details with the assigned guardian.',
    required: false,
    dataCategories: ['Location', 'Route', 'Pickup stop'],
  },
  {
    name: 'Third-party LMS',
    description: 'Sharing the minimum profile needed to provision a learning-platform account.',
    required: false,
    dataCategories: ['Name', 'Email', 'Class'],
  },
];

/** Channel through which a consent decision was captured. */
export const CONSENT_CHANNEL_OPTIONS: { value: 'app' | 'paper' | 'verbal'; label: string }[] = [
  { value: 'app', label: 'In-app' },
  { value: 'paper', label: 'Paper form' },
  { value: 'verbal', label: 'Verbal' },
];

export const CONSENT_STATE_OPTIONS: { value: Exclude<ConsentState, 'pending'>; label: string }[] = [
  { value: 'granted', label: 'Granted' },
  { value: 'denied', label: 'Denied' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

/** Icon + class suffix for the per-purpose consent count chips. */
export const CONSENT_COUNT_META: Record<'granted' | 'denied' | 'withdrawn', { label: string; icon: IconName }> = {
  granted: { label: 'Granted', icon: 'check-circle' },
  denied: { label: 'Denied', icon: 'x' },
  withdrawn: { label: 'Withdrawn', icon: 'minus-circle' },
};
