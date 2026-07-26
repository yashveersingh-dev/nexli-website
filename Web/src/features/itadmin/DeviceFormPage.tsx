import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormDate, FormTextarea, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { useItAssets, createItAsset, updateItAsset } from './data';
import { ASSET_TYPE_OPTIONS, ASSET_STATUS_OPTIONS } from './meta';
import { assetSchema, emptyAsset, assetToForm, formToAsset, type AssetValues } from './schema';

export function DeviceFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member, role, secondaryRole, isSuperAdmin } = useSession();
  // Match the hub: device WRITES are owner-only (it_admin / super admin), even
  // though leadership holds settings.manage for viewing/auditing.
  const canManage = role === 'it_admin' || secondaryRole === 'it_admin' || isSuperAdmin;
  // Reuse the list hook to find the record (data layer has no single-asset hook).
  const { data: assets, loading } = useItAssets(mode === 'edit' ? schoolId : undefined);
  const existing = mode === 'edit' ? assets.find((a) => a.id === id) : undefined;

  const [defaults, setDefaults] = useState<AssetValues | null>(mode === 'new' ? emptyAsset : null);

  useEffect(() => {
    if (mode === 'edit' && existing) setDefaults(assetToForm(existing));
  }, [mode, existing]);

  // Return to the Devices tab the form was launched from (not the Overview default).
  const back = () => navigate('/it-admin?tab=devices');

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (!canManage) {
    return (
      <div className="nx-page">
        <EmptyState icon="lock" title="You can't edit devices" message="Ask an IT administrator for access."
          action={<Button variant="subtle" onClick={back}>Back to IT Administration</Button>} />
      </div>
    );
  }
  if (mode === 'edit' && loading && !defaults) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={360} /></div>;
  if (mode === 'edit' && !loading && !existing) {
    return (
      <div className="nx-page">
        <EmptyState icon="server" title="Device not found"
          action={<Button variant="subtle" onClick={back}>Back to IT Administration</Button>} />
      </div>
    );
  }
  if (!defaults) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={360} /></div>;

  const actor = { uid: uid ?? 'unknown', name: member?.name };

  return (
    <div className="nx-page">
      <Form<AssetValues>
        schema={assetSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const payload = formToAsset(values);
            if (mode === 'new') {
              await createItAsset(schoolId, { ...payload, schoolId }, actor);
              toast.success('Device added', payload.name);
            } else {
              await updateItAsset(schoolId, id, payload, actor);
              toast.success('Device updated', payload.name);
            }
            back();
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <DeviceFormBody mode={mode} onCancel={back} />
      </Form>
    </div>
  );
}

function DeviceFormBody({ mode, onCancel }: { mode: 'new' | 'edit'; onCancel: () => void }) {
  const { formState } = useFormContext<AssetValues>();
  return (
    <FormPage
      title={mode === 'new' ? 'New device' : 'Edit device'}
      subtitle={mode === 'new' ? 'Register an IT asset into the device register.' : 'Update this device record.'}
      breadcrumbs={[{ label: 'IT Administration', onClick: onCancel }, { label: mode === 'new' ? 'New device' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Add device' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Device" description="What it is and where it lives.">
        <FormInput<AssetValues> name="name" label="Device name" required placeholder="e.g. Dell OptiPlex 3090" />
        <FormSelect<AssetValues> name="type" label="Type" required options={ASSET_TYPE_OPTIONS} />
        <FormInput<AssetValues> name="assetTag" label="Asset tag / code" placeholder="e.g. IT-2026-014" />
        <FormInput<AssetValues> name="serialNo" label="Serial number" placeholder="Manufacturer serial" />
        <FormInput<AssetValues> name="location" label="Location / lab" placeholder="e.g. Computer Lab 1" />
        <FormSelect<AssetValues> name="status" label="Status" required options={ASSET_STATUS_OPTIONS} />
      </FormSection>

      <FormSection title="Allocation & warranty" description="Who holds it and AMC/warranty tracking.">
        <FormInput<AssetValues> name="assignedTo" label="Assigned to" placeholder="Staff / department / lab" />
        <FormDate<AssetValues> name="warrantyUntil" label="Warranty / AMC until" />
      </FormSection>

      <FormSection title="Notes" single>
        <FormTextarea<AssetValues> name="notes" label="Notes" rows={2} placeholder="Condition, configuration, remarks" />
      </FormSection>
    </FormPage>
  );
}
