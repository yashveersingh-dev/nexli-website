import { useEffect, useState } from 'react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Field, Input, Select, Toggle } from '@/components/form';
import { Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatRelative } from '@/lib/format';
import { useSession } from '@/app/providers/SessionProvider';
import { useUdiseProfile, saveUdiseProfile, type Actor } from './data';
import {
  FACILITY_META, type FacilityKey,
  INFRA_COUNT_META, type InfraCountKey,
  SCHOOL_CATEGORY_OPTIONS, MANAGEMENT_OPTIONS, BOARD_OPTIONS,
} from './meta';
import type { UdiseProfile } from '@/types/compliance';

/** Editable local form state — strings for inputs, booleans for toggles. */
interface FormState {
  udiseCode: string;
  schoolCategory: string;
  management: string;
  affiliationBoard: string;
  yearEstablished: string;
  classrooms: string;
  functionalToilets: string;
  /** UDISE+ numeric infrastructure counts (boys/girls/CWSN toilets, books, ICT). */
  counts: Record<InfraCountKey, string>;
  facilities: Record<FacilityKey, boolean>;
}

const emptyFacilities = (): Record<FacilityKey, boolean> =>
  FACILITY_META.reduce((acc, f) => ({ ...acc, [f.key]: false }), {} as Record<FacilityKey, boolean>);

const emptyCounts = (): Record<InfraCountKey, string> =>
  INFRA_COUNT_META.reduce((acc, c) => ({ ...acc, [c.key]: '' }), {} as Record<InfraCountKey, string>);

function fromProfile(p?: UdiseProfile): FormState {
  return {
    udiseCode: p?.udiseCode ?? '',
    schoolCategory: p?.schoolCategory ?? '',
    management: p?.management ?? '',
    affiliationBoard: p?.affiliationBoard ?? '',
    yearEstablished: p?.yearEstablished ?? '',
    classrooms: p?.classrooms != null ? String(p.classrooms) : '',
    functionalToilets: p?.functionalToilets != null ? String(p.functionalToilets) : '',
    counts: INFRA_COUNT_META.reduce(
      (acc, c) => ({ ...acc, [c.key]: p?.[c.key] != null ? String(p[c.key]) : '' }),
      emptyCounts(),
    ),
    facilities: FACILITY_META.reduce(
      (acc, f) => ({ ...acc, [f.key]: p?.[f.key] ?? false }),
      emptyFacilities(),
    ),
  };
}

/** Coerce a numeric string field to a number, or undefined when blank. */
function num(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** School UDISE+ profile — code, infrastructure counts and facility toggles. */
export function ProfileTab() {
  const toast = useToast();
  const { schoolId, uid, member, can } = useSession();
  const canWrite = can('compliance.write');
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: profile, loading } = useUdiseProfile(schoolId);

  const [form, setForm] = useState<FormState>(() => fromProfile());
  const [saving, setSaving] = useState(false);

  // Hydrate once the profile doc arrives (and on any external change).
  useEffect(() => {
    setForm(fromProfile(profile ?? undefined));
  }, [profile]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setFacility = (key: FacilityKey, value: boolean) =>
    setForm((f) => ({ ...f, facilities: { ...f.facilities, [key]: value } }));
  const setCount = (key: InfraCountKey, value: string) =>
    setForm((f) => ({ ...f, counts: { ...f.counts, [key]: value } }));

  const save = async () => {
    if (!schoolId || !canWrite) return;
    setSaving(true);
    const countValues = INFRA_COUNT_META.reduce(
      (acc, c) => ({ ...acc, [c.key]: num(form.counts[c.key]) }),
      {} as Record<InfraCountKey, number | undefined>,
    );
    const payload: UdiseProfile = {
      udiseCode: form.udiseCode.trim() || undefined,
      schoolCategory: form.schoolCategory || undefined,
      management: form.management || undefined,
      affiliationBoard: form.affiliationBoard || undefined,
      yearEstablished: form.yearEstablished.trim() || undefined,
      classrooms: num(form.classrooms),
      functionalToilets: num(form.functionalToilets),
      ...countValues,
      ...form.facilities,
      lastSyncedAt: Date.now(),
    };
    try {
      await saveUdiseProfile(schoolId, payload, actor);
      toast.success('Profile saved', 'School UDISE+ profile updated.');
    } catch {
      toast.error('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton height={220} />
        <Skeleton height={240} />
      </div>
    );
  }

  return (
    <div className="udise-stack">
      <Panel title="School identity" sub="UDISE+ basics" bodyClassName="udise-panel__body">
        <div className="grid g-2">
          <Field label="UDISE+ code" hint="11-digit national school code">
            <Input value={form.udiseCode} onChange={(e) => set('udiseCode', e.target.value)} placeholder="e.g. 09150402301" inputMode="numeric" maxLength={11} disabled={!canWrite} />
          </Field>
          <Field label="Year established">
            <Input value={form.yearEstablished} onChange={(e) => set('yearEstablished', e.target.value)} placeholder="e.g. 1998" inputMode="numeric" maxLength={4} disabled={!canWrite} />
          </Field>
        </div>
        <div className="grid g-2">
          <Field label="School category">
            <Select value={form.schoolCategory} onChange={(e) => set('schoolCategory', e.target.value)} placeholder="Select category" options={SCHOOL_CATEGORY_OPTIONS} disabled={!canWrite} />
          </Field>
          <Field label="Management">
            <Select value={form.management} onChange={(e) => set('management', e.target.value)} placeholder="Select management" options={MANAGEMENT_OPTIONS} disabled={!canWrite} />
          </Field>
        </div>
        <div className="grid g-2">
          <Field label="Affiliation board">
            <Select value={form.affiliationBoard} onChange={(e) => set('affiliationBoard', e.target.value)} placeholder="Select board" options={BOARD_OPTIONS} disabled={!canWrite} />
          </Field>
          <div />
        </div>
      </Panel>

      <Panel title="Infrastructure" sub="Physical facilities" bodyClassName="udise-panel__body">
        <div className="grid g-2">
          <Field label="Classrooms" hint="Total instructional rooms">
            <Input value={form.classrooms} onChange={(e) => set('classrooms', e.target.value)} placeholder="e.g. 24" inputMode="numeric" disabled={!canWrite} />
          </Field>
          <Field label="Functional toilets" hint="Total, in working condition">
            <Input value={form.functionalToilets} onChange={(e) => set('functionalToilets', e.target.value)} placeholder="e.g. 12" inputMode="numeric" disabled={!canWrite} />
          </Field>
        </div>

        {/* UDISE+ infrastructure counts (toilets split, library books, ICT). */}
        <div className="grid g-2">
          {INFRA_COUNT_META.map((c) => (
            <Field key={c.key} label={c.label} hint={c.hint}>
              <Input
                value={form.counts[c.key]}
                onChange={(e) => setCount(c.key, e.target.value)}
                placeholder={c.placeholder}
                inputMode="numeric"
                disabled={!canWrite}
              />
            </Field>
          ))}
        </div>

        <div className="udise-fac-grid" role="group" aria-label="Facilities available">
          {FACILITY_META.map((f) => (
            <div key={f.key} className="udise-fac">
              <span className="udise-fac__icon"><Icon name={f.icon} size={16} /></span>
              <Toggle
                checked={form.facilities[f.key]}
                onChange={(v) => setFacility(f.key, v)}
                label={f.label}
                disabled={!canWrite}
                size="sm"
              />
            </div>
          ))}
        </div>
      </Panel>

      {canWrite ? (
        <div className="nx-savebar udise-noprint">
          <div className="nx-savebar__inner">
            <div className="nx-savebar__left">
              <Icon name={profile?.lastSyncedAt ? 'check-circle' : 'info'} size={16} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {profile?.lastSyncedAt ? `Last saved ${formatRelative(profile.lastSyncedAt)}` : 'Not yet saved'}
              </span>
            </div>
            <div className="nx-savebar__right">
              <Button variant="gold" leftIcon="check" loading={saving} onClick={save}>Save profile</Button>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          You have read-only access to the UDISE+ profile.
          {profile?.lastSyncedAt ? ` Last saved ${formatRelative(profile.lastSyncedAt)}.` : ''}
        </p>
      )}
    </div>
  );
}
