import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Skeleton, EmptyState } from '@/components/feedback';
import {
  Form, FormInput, FormSelect, FormDate, FormTextarea, FormPage, FormSection,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useAssets, useFacilities, createAsset, updateAsset } from '@/features/ops/data';
import { ASSET_CATEGORY_OPTIONS, ASSET_STATUS_META } from '@/features/ops/meta';
import {
  assetSchema, emptyAsset, assetToForm, formToAsset, type AssetValues,
} from './facilitySchema';
import '@/features/ops/ops.css';
import './facility.css';

const STATUS_OPTIONS = (Object.keys(ASSET_STATUS_META) as (keyof typeof ASSET_STATUS_META)[])
  .map((value) => ({ value, label: ASSET_STATUS_META[value].label }));

export function AssetFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('facility').canOperate;
  // Reuse the list hook to find the record (data layer has no single-asset hook).
  const { data: assets, loading } = useAssets(mode === 'edit' ? schoolId : undefined);
  const existing = mode === 'edit' ? assets.find((a) => a.id === id) : undefined;

  const [defaults, setDefaults] = useState<AssetValues | null>(mode === 'new' ? emptyAsset : null);

  useEffect(() => {
    if (mode === 'edit' && existing) setDefaults(assetToForm(existing));
  }, [mode, existing]);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (!canWrite) {
    return (
      <div className="nx-page">
        <EmptyState icon="lock" title="You can't edit assets" message="Ask an administrator for facility access."
          action={<Button variant="subtle" onClick={() => navigate('/facility')}>Back to assets</Button>} />
      </div>
    );
  }
  if (mode === 'edit' && loading && !defaults) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={360} /></div>;
  if (mode === 'edit' && !loading && !existing) {
    return (
      <div className="nx-page">
        <EmptyState icon="box" title="Asset not found"
          action={<Button variant="subtle" onClick={() => navigate('/facility')}>Back to assets</Button>} />
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
              await createAsset(schoolId, { ...payload, schoolId }, actor);
              toast.success('Asset added', payload.name);
            } else {
              await updateAsset(schoolId, id, payload, actor);
              toast.success('Asset updated', payload.name);
            }
            navigate('/facility');
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <AssetFormBody mode={mode} onCancel={() => navigate('/facility')} />
      </Form>
    </div>
  );
}

function AssetFormBody({ mode, onCancel }: { mode: 'new' | 'edit'; onCancel: () => void }) {
  const { schoolId } = useSession();
  const { formState } = useFormContext<AssetValues>();
  const { data: facilities } = useFacilities(schoolId);
  const facilityOptions = [
    { value: '', label: 'None' },
    ...facilities.map((f) => ({ value: f.id, label: f.building ? `${f.name} · ${f.building}` : f.name })),
  ];

  return (
    <FormPage
      title={mode === 'new' ? 'New asset' : 'Edit asset'}
      subtitle={mode === 'new' ? 'Register an item into the asset register.' : 'Update this asset record.'}
      breadcrumbs={[{ label: 'Asset & Facility', onClick: onCancel }, { label: mode === 'new' ? 'New asset' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Add asset' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Item" description="What it is and where it lives.">
        <FormInput<AssetValues> name="name" label="Asset name" required placeholder="e.g. Dell OptiPlex 3090" />
        <FormInput<AssetValues> name="tag" label="Asset tag / code" placeholder="e.g. IT-2026-014" />
        <FormSelect<AssetValues> name="category" label="Category" required options={ASSET_CATEGORY_OPTIONS} />
        <FormSelect<AssetValues> name="status" label="Status" required options={STATUS_OPTIONS} />
        <FormInput<AssetValues> name="location" label="Location" placeholder="e.g. Computer Lab 1" />
        <FormSelect<AssetValues> name="facilityId" label="Facility" options={facilityOptions} />
        <FormInput<AssetValues> name="quantity" label="Quantity" type="number" inputMode="numeric" min={0} />
        <FormInput<AssetValues> name="assignedTo" label="Assigned to" placeholder="Staff / department" />
      </FormSection>

      <FormSection title="Purchase & warranty" description="Procurement details for valuation and AMC tracking.">
        <FormDate<AssetValues> name="purchaseDate" label="Purchase date" />
        <FormInput<AssetValues> name="cost" label="Cost (₹)" type="number" inputMode="numeric" min={0} prefix="₹" />
        <FormInput<AssetValues> name="vendorName" label="Vendor" placeholder="Supplier name" />
        <FormDate<AssetValues> name="warrantyExpiry" label="Warranty expiry" />
      </FormSection>

      <FormSection title="Notes" single>
        <FormTextarea<AssetValues> name="notes" label="Notes" rows={2} placeholder="Condition, serial no., remarks" />
      </FormSection>
    </FormPage>
  );
}
