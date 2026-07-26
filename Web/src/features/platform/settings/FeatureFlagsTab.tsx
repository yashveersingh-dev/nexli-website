import { useState } from 'react';
import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';
import { Field, Select } from '@/components/form';
import { Skeleton, EmptyState, InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import {
  useGlobalFlags,
  saveGlobalFlags,
  useSchools,
  useSchoolFlags,
  saveSchoolFlags,
} from '@/features/platform/data';
import {
  FEATURE_FLAGS,
  DEFAULT_FLAGS,
  type FeatureFlagKey,
  type FlagMap,
} from '@/lib/featureFlags';
import { FlagRow } from './FlagRow';

/** Feature Flags (spec §12.4): global kill-switches + per-school overrides. */
export function FeatureFlagsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <GlobalFlags />
      <PerSchoolFlags />
    </div>
  );
}

/* ---------------- Global ---------------- */

function GlobalFlags() {
  const toast = useToast();
  const { uid, member } = useSession();
  const { data: globalFlags, loading } = useGlobalFlags();

  // Optimistic local overlay so toggles feel instant while the write is in flight.
  const [pending, setPending] = useState<Partial<FlagMap>>({});
  const [savingKey, setSavingKey] = useState<FeatureFlagKey | null>(null);

  const valueFor = (key: FeatureFlagKey): boolean =>
    pending[key] ?? globalFlags?.[key] ?? DEFAULT_FLAGS[key];

  const onToggle = async (key: FeatureFlagKey, value: boolean) => {
    setPending((p) => ({ ...p, [key]: value }));
    setSavingKey(key);
    try {
      await saveGlobalFlags({ [key]: value }, { uid: uid ?? 'unknown', name: member?.name });
    } catch {
      // Roll back the optimistic value on failure.
      setPending((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
      toast.error('Could not update flag', 'Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Panel
      title="Global feature flags"
      sub="apply to every school"
      headerRight={
        savingKey ? (
          <span className="nx-settings__saving">
            <Icon name="refresh" size={13} />
            Saving…
          </span>
        ) : null
      }
    >
      <InfoCard icon="alert-triangle" title="Emergency kill switch">
        Toggling a module <strong>OFF</strong> here disables it across <strong>all schools</strong> instantly,
        overriding their plan — unless a school has an explicit per-school override below, which always wins.
      </InfoCard>

      <div className="nx-switchlist" style={{ marginTop: 14 }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={52} style={{ marginTop: i ? 8 : 0 }} />)
          : FEATURE_FLAGS.map((flag) => (
              <FlagRow
                key={flag.key}
                flag={flag}
                checked={valueFor(flag.key)}
                disabled={savingKey === flag.key}
                onChange={(v) => void onToggle(flag.key, v)}
              />
            ))}
      </div>
    </Panel>
  );
}

/* ---------------- Per-school ---------------- */

function PerSchoolFlags() {
  const { data: schools, loading: schoolsLoading } = useSchools();
  const [schoolId, setSchoolId] = useState('');

  if (schoolsLoading) {
    return (
      <Panel title="Per-school override" sub="fine-tune one school">
        <Skeleton height={44} width="60%" />
      </Panel>
    );
  }

  if (schools.length === 0) {
    return (
      <Panel title="Per-school override" sub="fine-tune one school">
        <EmptyState
          icon="school"
          title="No schools yet"
          message="Register a school to set per-school feature overrides."
        />
      </Panel>
    );
  }

  return (
    <Panel title="Per-school override" sub="fine-tune one school">
      <Field label="School" className="nx-settings__picker">
        <Select
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          placeholder="Select a school"
          options={schools.map((s) => ({ value: s.id, label: s.name }))}
        />
      </Field>

      {schoolId ? (
        <SchoolFlagList key={schoolId} schoolId={schoolId} />
      ) : (
        <div style={{ marginTop: 14 }}>
          <InfoCard icon="info" title="Pick a school">
            Choose a school above to override individual modules. Overrides layer on top of the global
            values; the effective result for each module is shown per row.
          </InfoCard>
        </div>
      )}
    </Panel>
  );
}

function SchoolFlagList({ schoolId }: { schoolId: string }) {
  const toast = useToast();
  const { uid, member } = useSession();
  const { data: globalFlags } = useGlobalFlags();
  const { data: schoolFlags, loading } = useSchoolFlags(schoolId);

  const [pending, setPending] = useState<Partial<FlagMap>>({});
  const [savingKey, setSavingKey] = useState<FeatureFlagKey | null>(null);

  const globalValue = (key: FeatureFlagKey): boolean => globalFlags?.[key] ?? DEFAULT_FLAGS[key];
  const overrideValue = (key: FeatureFlagKey): boolean | undefined => {
    if (key in pending) return pending[key];
    return schoolFlags?.[key];
  };
  // Effective resolution: per-school override wins, else the global value.
  const effective = (key: FeatureFlagKey): boolean => overrideValue(key) ?? globalValue(key);

  const onToggle = async (key: FeatureFlagKey, value: boolean) => {
    setPending((p) => ({ ...p, [key]: value }));
    setSavingKey(key);
    try {
      await saveSchoolFlags(schoolId, { [key]: value }, { uid: uid ?? 'unknown', name: member?.name });
    } catch {
      setPending((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
      toast.error('Could not update override', 'Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="nx-switchlist" style={{ marginTop: 14 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={52} style={{ marginTop: i ? 8 : 0 }} />
        ))}
      </div>
    );
  }

  return (
    <>
      {savingKey && (
        <div className="nx-settings__saving" style={{ marginTop: 12 }}>
          <Icon name="refresh" size={13} />
          Saving override…
        </div>
      )}
      <div className="nx-switchlist" style={{ marginTop: 12 }}>
        {FEATURE_FLAGS.map((flag) => {
          const ov = overrideValue(flag.key);
          const gv = globalValue(flag.key);
          return (
            <FlagRow
              key={flag.key}
              flag={flag}
              checked={effective(flag.key)}
              disabled={savingKey === flag.key}
              onChange={(v) => void onToggle(flag.key, v)}
              hint={
                <>
                  <Icon name={effective(flag.key) ? 'check-circle' : 'minus-circle'} size={12} />
                  Effective: <strong>{effective(flag.key) ? 'On' : 'Off'}</strong>
                  {' · '}Global: {gv ? 'On' : 'Off'}
                  {ov === undefined ? ' · No override' : ' · Overridden'}
                </>
              }
            />
          );
        })}
      </div>
    </>
  );
}
