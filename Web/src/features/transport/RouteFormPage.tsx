import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormPage, FormSection, Field, Input } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useRoute, useVehicles, createRoute, updateRoute } from '@/features/ops/data';
import type { TransportRoute } from '@/types/ops';
import { routeSchema, emptyRoute, emptyStop, stopsToRecords, SHIFT_OPTIONS, type RouteValues } from './routeSchema';

function toForm(r: TransportRoute): RouteValues {
  return {
    name: r.name, code: r.code ?? '', shift: r.shift ?? 'both', vehicleId: r.vehicleId ?? '',
    monthlyFee: r.monthlyFee != null ? String(r.monthlyFee) : '', status: r.status ?? 'active',
    stops: r.stops?.length
      ? r.stops.slice().sort((a, b) => a.order - b.order).map((s) => ({
          name: s.name, time: s.time ?? '', lat: s.lat != null ? String(s.lat) : '', lng: s.lng != null ? String(s.lng) : '',
        }))
      : emptyRoute.stops,
  };
}

export function RouteFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('transport').canOperate;
  const { data: existing, loading } = useRoute(mode === 'edit' ? schoolId : undefined, mode === 'edit' ? id : undefined);
  const { data: vehicles } = useVehicles(schoolId);

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (!canWrite) return <div className="nx-page"><EmptyState icon="lock" title="No access" message="You don't have permission to manage routes." action={<Button variant="subtle" onClick={() => navigate('/transport')}>Back</Button>} /></div>;
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={360} /></div>;
  if (mode === 'edit' && !existing) {
    return <div className="nx-page"><EmptyState icon="map-pin" title="Route not found" action={<Button variant="subtle" onClick={() => navigate('/transport')}>Back</Button>} /></div>;
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const defaults = mode === 'edit' && existing ? toForm(existing) : emptyRoute;

  return (
    <div className="nx-page">
      <Form<RouteValues>
        schema={routeSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const vehicle = vehicles.find((v) => v.id === values.vehicleId);
            const payload: Omit<TransportRoute, 'id'> = {
              schoolId,
              name: values.name.trim(),
              code: values.code?.trim() || undefined,
              shift: values.shift,
              vehicleId: values.vehicleId || undefined,
              vehicleRegNo: vehicle?.regNo,
              driverName: vehicle?.driverName,
              stops: stopsToRecords(values.stops),
              monthlyFee: values.monthlyFee ? Number(values.monthlyFee) : undefined,
              status: values.status,
            };
            if (mode === 'new') { await createRoute(schoolId, payload, actor); toast.success('Route created', payload.name); }
            else { await updateRoute(schoolId, id, payload, actor); toast.success('Route updated', payload.name); }
            navigate('/transport');
          } catch { toast.error('Could not save', 'Please try again.'); }
        }}
      >
        <RouteBody mode={mode} vehicles={vehicles} onCancel={() => navigate('/transport')} />
      </Form>
    </div>
  );
}

function RouteBody({ mode, vehicles, onCancel }: {
  mode: 'new' | 'edit'; vehicles: ReturnType<typeof useVehicles>['data']; onCancel: () => void;
}) {
  const { control, formState, register, watch } = useFormContext<RouteValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'stops' });
  const errors = formState.errors;

  const vehicleOptions = [
    { value: '', label: 'No vehicle assigned' },
    ...vehicles.slice().sort((a, b) => a.regNo.localeCompare(b.regNo)).map((v) => ({ value: v.id, label: `${v.regNo}${v.type ? ` · ${v.type}` : ''}` })),
  ];

  return (
    <FormPage
      title={mode === 'new' ? 'New route' : 'Edit route'}
      subtitle="Name the route, assign a vehicle, and list the stops in pickup order."
      breadcrumbs={[{ label: 'Transport', onClick: onCancel }, { label: mode === 'new' ? 'New route' : 'Edit' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Create route' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="Details">
        <FormInput<RouteValues> name="name" label="Route name" required placeholder="e.g. North Loop — Sector 18" />
        <FormInput<RouteValues> name="code" label="Route code" placeholder="e.g. R-01" />
        <FormSelect<RouteValues> name="shift" label="Shift" options={SHIFT_OPTIONS} />
        <FormSelect<RouteValues> name="vehicleId" label="Vehicle" options={vehicleOptions} />
        <FormInput<RouteValues> name="monthlyFee" label="Monthly fee (₹)" type="number" inputMode="numeric" placeholder="0" />
        <FormSelect<RouteValues> name="status" label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
      </FormSection>

      <FormSection
        title="Stops"
        description="List each stop in order. Add latitude/longitude to plot it on the live map (optional)."
        single
        aside={<Button type="button" variant="subtle" size="sm" leftIcon="plus" onClick={() => append(emptyStop())}>Add stop</Button>}
      >
        {fields.map((f, i) => {
          const stopErr = errors.stops?.[i];
          return (
            <div className="tr-stoprow" key={f.id}>
              <span className="tr-stoprow__order" aria-hidden="true">{i + 1}</span>
              <div className="tr-stoprow__fields">
                <Field label={i === 0 ? 'Stop name' : undefined} error={stopErr?.name?.message}>
                  <Input {...register(`stops.${i}.name`)} placeholder="Stop name" invalid={!!stopErr?.name} aria-label={`Stop ${i + 1} name`} />
                </Field>
                <Field label={i === 0 ? 'Time' : undefined}>
                  <Input {...register(`stops.${i}.time`)} placeholder="07:15" aria-label={`Stop ${i + 1} time`} />
                </Field>
                <Field label={i === 0 ? 'Latitude' : undefined} error={stopErr?.lat?.message}>
                  <Input {...register(`stops.${i}.lat`)} inputMode="decimal" placeholder="Optional" invalid={!!stopErr?.lat} aria-label={`Stop ${i + 1} latitude`} />
                </Field>
                <Field label={i === 0 ? 'Longitude' : undefined} error={stopErr?.lng?.message}>
                  <Input {...register(`stops.${i}.lng`)} inputMode="decimal" placeholder="Optional" invalid={!!stopErr?.lng} aria-label={`Stop ${i + 1} longitude`} />
                </Field>
              </div>
              <div className="tr-stoprow__rm">
                {fields.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" leftIcon="x" aria-label={`Remove stop ${i + 1}`} onClick={() => remove(i)} />
                )}
              </div>
            </div>
          );
        })}
        {typeof errors.stops?.message === 'string' && (
          <p className="nx-field__error" role="alert" style={{ marginTop: 6 }}><Icon name="alert-triangle" size={12} /> {errors.stops.message}</p>
        )}
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>{watch('stops')?.length ?? 0} stop(s)</p>
      </FormSection>
    </FormPage>
  );
}
