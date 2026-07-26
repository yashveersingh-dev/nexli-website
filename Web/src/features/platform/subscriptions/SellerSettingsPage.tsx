import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Field, Input, Textarea } from '@/components/form';
import { InfoCard, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { usePlatformSettings, savePlatformSettings } from '@/features/platform/data';
import type { GstSellerSettings } from '@/types/models';

interface FormState {
  legalName: string;
  tradeName: string;
  gstin: string;
  stateName: string;
  stateCode: string;
  address: string; // one line per address line
  email: string;
  phone: string;
  sac: string;
  pan: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
}

function toForm(s: GstSellerSettings | undefined): FormState {
  return {
    legalName: s?.legalName ?? '',
    tradeName: s?.tradeName ?? '',
    gstin: s?.gstin ?? '',
    stateName: s?.stateName ?? '',
    stateCode: s?.stateCode ?? '',
    address: (s?.addressLines ?? []).join('\n'),
    email: s?.email ?? '',
    phone: s?.phone ?? '',
    sac: s?.sac ?? '',
    pan: s?.pan ?? '',
    bankName: s?.bankName ?? '',
    bankAccount: s?.bankAccount ?? '',
    bankIfsc: s?.bankIfsc ?? '',
  };
}

/**
 * Super-admin GST seller (Nexli legal-entity) details for subscription tax
 * invoices. Saved to `platform_settings/global → gstSeller`; the invoice builder
 * (`gst.ts → resolveSeller`) overlays these onto the source placeholder, so any
 * field left blank falls back to the placeholder. An invoice with a wrong/blank
 * GSTIN is not valid — fill these before issuing invoices to customers.
 */
export function SellerSettingsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { uid, member } = useSession();
  const { data: settings, loading } = usePlatformSettings();

  const [form, setForm] = useState<FormState>(() => toForm(settings?.gstSeller));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(toForm(settings?.gstSeller)); }, [settings]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async () => {
    setSaving(true);
    try {
      // Only persist provided values; blanks become undefined so the placeholder
      // fallback (resolveSeller) keeps applying for unfilled fields.
      const trimmed = (v: string) => (v.trim() ? v.trim() : undefined);
      const lines = form.address.split('\n').map((l) => l.trim()).filter(Boolean);
      const gstSeller: GstSellerSettings = {
        legalName: trimmed(form.legalName),
        tradeName: trimmed(form.tradeName),
        gstin: trimmed(form.gstin),
        stateName: trimmed(form.stateName),
        stateCode: trimmed(form.stateCode),
        addressLines: lines.length ? lines : undefined,
        email: trimmed(form.email),
        phone: trimmed(form.phone),
        sac: trimmed(form.sac),
        pan: trimmed(form.pan),
        bankName: trimmed(form.bankName),
        bankAccount: trimmed(form.bankAccount),
        bankIfsc: trimmed(form.bankIfsc),
      };
      await savePlatformSettings({ gstSeller }, { uid: uid ?? 'unknown', name: member?.name });
      toast.success('Seller details saved', 'GST invoices will use these details.');
    } catch {
      toast.error('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="nx-page">
        <Panel><Skeleton height={28} width="40%" /><Skeleton height={200} style={{ marginTop: 16 }} /></Panel>
      </div>
    );
  }

  return (
    <div className="nx-page">
      <Button variant="ghost" size="sm" leftIcon="chevron-left" onClick={() => navigate('/subscriptions')}>Subscriptions</Button>
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Seller / GST details</h1>
          <p className="nx-page__sub">Nexli's registered legal-entity details printed on subscription tax invoices.</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void onSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel title="Legal entity" sub="as registered for GST">
          <div className="grid g-2">
            <Field label="Legal name" hint="Pvt Ltd / LLP / Proprietor name as on the GST registration">
              <Input value={form.legalName} onChange={(e) => set('legalName', e.target.value)} placeholder="Nexli Technologies Pvt Ltd" autoComplete="off" />
            </Field>
            <Field label="Trade name" optional>
              <Input value={form.tradeName} onChange={(e) => set('tradeName', e.target.value)} placeholder="Nexli" autoComplete="off" />
            </Field>
            <Field label="GSTIN" hint="15-char GSTIN, e.g. 09ABCDE1234F1Z5">
              <Input value={form.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="09ABCDE1234F1Z5" autoComplete="off" maxLength={15} />
            </Field>
            <Field label="PAN" optional>
              <Input value={form.pan} onChange={(e) => set('pan', e.target.value)} placeholder="ABCDE1234F" autoComplete="off" maxLength={10} />
            </Field>
            <Field label="State of registration">
              <Input value={form.stateName} onChange={(e) => set('stateName', e.target.value)} placeholder="Uttar Pradesh" autoComplete="off" />
            </Field>
            <Field label="GST state code" hint="2 digits — must match the first two of the GSTIN">
              <Input value={form.stateCode} onChange={(e) => set('stateCode', e.target.value)} placeholder="09" inputMode="numeric" autoComplete="off" maxLength={2} />
            </Field>
            <Field label="SAC" hint="Service Accounting Code for the supply (e.g. 998314)">
              <Input value={form.sac} onChange={(e) => set('sac', e.target.value)} placeholder="998314" inputMode="numeric" autoComplete="off" maxLength={8} />
            </Field>
          </div>
          <Field label="Registered address" hint="One line per row — printed under the seller block">
            <Textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={3} placeholder={'Line 1\nLine 2\nCity, State, PIN'} />
          </Field>
          <div className="grid g-2">
            <Field label="Billing email" optional>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="billing@nexli.app" autoComplete="off" />
            </Field>
            <Field label="Billing phone" optional>
              <Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 ..." autoComplete="off" />
            </Field>
          </div>
        </Panel>

        <Panel title="Bank details" sub="optional — printed for payment">
          <div className="grid g-2">
            <Field label="Bank name" optional>
              <Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Account number" optional>
              <Input value={form.bankAccount} onChange={(e) => set('bankAccount', e.target.value)} inputMode="numeric" autoComplete="off" />
            </Field>
            <Field label="IFSC" optional>
              <Input value={form.bankIfsc} onChange={(e) => set('bankIfsc', e.target.value)} autoComplete="off" />
            </Field>
          </div>
        </Panel>

        <InfoCard icon="info" title="Fallback behaviour">
          Any field left blank falls back to the built-in placeholder, which is clearly marked as
          unconfigured. A valid tax invoice needs the correct legal name, GSTIN and state code, so
          fill these before invoicing customers.
        </InfoCard>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="gold" leftIcon="check" loading={saving}>Save seller details</Button>
        </div>
      </form>
    </div>
  );
}
