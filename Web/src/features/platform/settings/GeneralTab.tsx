import { useEffect, useState } from 'react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Field, Input, Select, Toggle } from '@/components/form';
import { Skeleton, InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { usePlatformSettings, savePlatformSettings } from '@/features/platform/data';
import type { PlatformSettings } from '@/types/models';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface FormState {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  academicYearStartMonth: string; // '' or '1'..'12'
  imagekitEndpoint: string;
  imagekitPublicKey: string;
  maintenanceMode: boolean;
}

function toForm(s: PlatformSettings | null): FormState {
  return {
    platformName: s?.platformName ?? '',
    supportEmail: s?.supportEmail ?? '',
    supportPhone: s?.supportPhone ?? '',
    academicYearStartMonth: s?.academicYearStartMonth ? String(s.academicYearStartMonth) : '',
    imagekitEndpoint: s?.imagekitEndpoint ?? '',
    imagekitPublicKey: s?.imagekitPublicKey ?? '',
    maintenanceMode: s?.maintenanceMode ?? false,
  };
}

/** General platform settings (spec §12.4) — branding, support, academic defaults, seams. */
export function GeneralTab() {
  const toast = useToast();
  const { uid, member } = useSession();
  const { data: settings, loading } = usePlatformSettings();

  const [form, setForm] = useState<FormState>(() => toForm(settings));
  const [saving, setSaving] = useState(false);

  // Hydrate once the live settings document arrives (and on external changes).
  useEffect(() => {
    setForm(toForm(settings));
  }, [settings]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (loading) {
    return (
      <Panel>
        <Skeleton height={28} width="40%" />
        <Skeleton height={120} style={{ marginTop: 16 }} />
        <Skeleton height={120} style={{ marginTop: 16 }} />
      </Panel>
    );
  }

  const onSubmit = async () => {
    setSaving(true);
    try {
      const patch: Partial<PlatformSettings> = {
        platformName: form.platformName.trim() || undefined,
        supportEmail: form.supportEmail.trim() || undefined,
        supportPhone: form.supportPhone.trim() || undefined,
        academicYearStartMonth: form.academicYearStartMonth
          ? Number(form.academicYearStartMonth)
          : undefined,
        imagekitEndpoint: form.imagekitEndpoint.trim() || undefined,
        imagekitPublicKey: form.imagekitPublicKey.trim() || undefined,
        maintenanceMode: form.maintenanceMode,
      };
      await savePlatformSettings(patch, { uid: uid ?? 'unknown', name: member?.name });
      toast.success('Settings saved', 'Platform configuration updated.');
    } catch {
      toast.error('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <Panel title="Branding & support" sub="shown across the platform">
        <div className="grid g-2">
          <Field label="Platform name">
            <Input
              value={form.platformName}
              onChange={(e) => set('platformName', e.target.value)}
              placeholder="NEXLI"
              leftIcon="settings"
              autoComplete="off"
            />
          </Field>
          <Field label="Academic year starts" hint="Default first month of the academic year.">
            <Select
              value={form.academicYearStartMonth}
              onChange={(e) => set('academicYearStartMonth', e.target.value)}
              placeholder="Select month"
              options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
            />
          </Field>
          <Field label="Support email">
            <Input
              type="email"
              value={form.supportEmail}
              onChange={(e) => set('supportEmail', e.target.value)}
              placeholder="support@nexli.app"
              leftIcon="mail"
              autoComplete="off"
            />
          </Field>
          <Field label="Support phone">
            <Input
              type="tel"
              value={form.supportPhone}
              onChange={(e) => set('supportPhone', e.target.value)}
              placeholder="+91 ..."
              leftIcon="phone"
              autoComplete="off"
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Media (ImageKit)" sub="image CDN seam">
        <div className="grid g-2">
          <Field label="ImageKit endpoint">
            <Input
              value={form.imagekitEndpoint}
              onChange={(e) => set('imagekitEndpoint', e.target.value)}
              placeholder="https://ik.imagekit.io/your_id"
              leftIcon="image"
              autoComplete="off"
            />
          </Field>
          <Field label="ImageKit public key">
            <Input
              value={form.imagekitPublicKey}
              onChange={(e) => set('imagekitPublicKey', e.target.value)}
              placeholder="public_xxxxxxxx"
              leftIcon="lock"
              autoComplete="off"
            />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <InfoCard icon="info" title="Integration seams">
            ImageKit isn't wired into uploads yet — these keys are stored for when the media pipeline goes
            live. Email / SMS sender configuration is a future paid integration and is managed under
            Feature Flags once provisioned.
          </InfoCard>
        </div>
      </Panel>

      <Panel title="Maintenance" sub="platform-wide">
        <div className="nx-switchlist">
          <div className="nx-switchlist__row">
            <Toggle
              checked={form.maintenanceMode}
              onChange={(v) => set('maintenanceMode', v)}
              label="Maintenance mode"
              description="Shows a maintenance notice and blocks non-admin access across every school."
            />
          </div>
        </div>
        {form.maintenanceMode && (
          <div style={{ marginTop: 14 }}>
            <InfoCard icon="alert-triangle" title="Maintenance mode is ON">
              School users will be locked out until this is turned off and saved.
            </InfoCard>
          </div>
        )}
      </Panel>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="gold" leftIcon="check" loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
