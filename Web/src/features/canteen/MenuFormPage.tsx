import { useNavigate, useParams } from 'react-router-dom';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Skeleton, EmptyState, InfoCard } from '@/components/feedback';
import { Form, FormInput, FormSelect, FormToggle, FormPage, FormSection } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useCanteenMenus, createMenu, updateMenu } from '@/features/ops/data';
import { MEAL_TYPE_OPTIONS } from '@/features/ops/meta';
import type { CanteenMenu } from '@/types/ops';
import { menuSchema, emptyMenu, toMenuForm, menuFromForm, MENU_SCOPE_OPTIONS, WEEKDAY_OPTIONS, type MenuValues } from './menuSchema';
import { mealLabel } from './lib';

export function MenuFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('canteen').canOperate;
  const { data: menus, loading } = useCanteenMenus(schoolId);
  const existing = menus.find((m) => m.id === id);

  const back = () => navigate('/canteen');

  if (!schoolId) return <div className="nx-page"><EmptyState icon="school" title="No school context" /></div>;
  if (!canWrite) {
    return <div className="nx-page"><EmptyState icon="lock" title="Not allowed" message="You don't have permission to manage menus." action={<Button variant="subtle" onClick={back}>Back to canteen</Button>} /></div>;
  }
  if (mode === 'edit' && loading) return <div className="nx-page"><Skeleton height={64} /><Skeleton height={360} /></div>;
  if (mode === 'edit' && !existing) {
    return <div className="nx-page"><EmptyState icon="utensils" title="Menu not found" action={<Button variant="subtle" onClick={back}>Back to canteen</Button>} /></div>;
  }

  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const defaults = mode === 'edit' && existing ? toMenuForm(existing) : emptyMenu();

  return (
    <div className="nx-page">
      <Form<MenuValues>
        schema={menuSchema}
        defaultValues={defaults}
        onSubmit={async (values) => {
          try {
            const base = menuFromForm(values);
            if (mode === 'new') {
              const payload: Omit<CanteenMenu, 'id'> = { schoolId, ...base };
              await createMenu(schoolId, payload, actor);
              toast.success('Menu saved', values.published ? 'Published to families.' : 'Saved as a draft.');
            } else {
              await updateMenu(schoolId, id, base, actor);
              toast.success('Menu updated');
            }
            back();
          } catch {
            toast.error('Could not save', 'Please try again.');
          }
        }}
      >
        <MenuBody mode={mode} onCancel={back} />
      </Form>
    </div>
  );
}

function MenuBody({ mode, onCancel }: { mode: 'new' | 'edit'; onCancel: () => void }) {
  const { control, watch, formState } = useFormContext<MenuValues>();
  const { fields: meals, append: addMeal, remove: removeMeal } = useFieldArray({ control, name: 'meals' });
  const scope = watch('scope');

  return (
    <FormPage
      title={mode === 'new' ? 'New canteen menu' : 'Edit menu'}
      subtitle="Plan a dated daily menu or a reusable weekday template. Each meal lists its dishes with a veg marker and optional calories."
      breadcrumbs={[{ label: 'Canteen', onClick: onCancel }, { label: mode === 'new' ? 'New menu' : 'Edit menu' }]}
      onBack={onCancel}
      onCancel={onCancel}
      submitLabel={mode === 'new' ? 'Save menu' : 'Save changes'}
      submitIcon="check"
      submitting={formState.isSubmitting}
    >
      <FormSection title="When" description="A specific date overrides the matching weekday template.">
        <FormSelect<MenuValues> name="scope" label="Applies to" options={MENU_SCOPE_OPTIONS} />
        {scope === 'date' ? (
          <FormInput<MenuValues> name="date" label="Date" type="date" required />
        ) : (
          <FormSelect<MenuValues> name="weekday" label="Weekday" options={WEEKDAY_OPTIONS} />
        )}
      </FormSection>

      <FormSection
        title="Meals"
        description="Add a block per meal served."
        single
        aside={
          <Button type="button" variant="subtle" size="sm" leftIcon="plus" onClick={() => addMeal({ type: nextMealType(meals.map((m) => watchMealType(m))), items: [{ name: '', veg: true, calories: '' }] })}>
            Add meal
          </Button>
        }
      >
        {meals.length === 0 ? (
          <InfoCard icon="info" title="No meals yet">Add a meal (e.g. Lunch) and then list its dishes.</InfoCard>
        ) : (
          meals.map((meal, mi) => (
            <MealEditor key={meal.id} mealIndex={mi} canRemove={meals.length > 1} onRemove={() => removeMeal(mi)} />
          ))
        )}
      </FormSection>

      <FormSection title="Notes" single>
        <FormInput<MenuValues> name="notes" label="Notes (optional)" placeholder="e.g. Special festival menu, allergen info" />
      </FormSection>

      <FormSection title="Visibility">
        <FormToggle<MenuValues> name="published" label="Published" />
      </FormSection>
    </FormPage>
  );
}

function MealEditor({ mealIndex, canRemove, onRemove }: { mealIndex: number; canRemove: boolean; onRemove: () => void }) {
  const { control, watch } = useFormContext<MenuValues>();
  const { fields, append, remove } = useFieldArray({ control, name: `meals.${mealIndex}.items` });
  const type = watch(`meals.${mealIndex}.type`);

  return (
    <div className="cant-meal">
      <div className="cant-meal__head">
        <span className="cant-meal__title">
          <Icon name="utensils" size={14} /> {mealLabel(type)}
        </span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" leftIcon="minus-circle" aria-label={`Remove ${mealLabel(type)} meal`} onClick={onRemove} />
        )}
      </div>

      <div className="nx-section__grid" style={{ marginBottom: 10 }}>
        <FormSelect<MenuValues> name={`meals.${mealIndex}.type`} label="Meal" options={MEAL_TYPE_OPTIONS} />
      </div>

      {fields.map((item, ii) => (
        <div className="cant-itemrow" key={item.id}>
          <FormInput<MenuValues> name={`meals.${mealIndex}.items.${ii}.name`} label={ii === 0 ? 'Dish' : undefined} placeholder="e.g. Veg pulao" />
          <FormInput<MenuValues> name={`meals.${mealIndex}.items.${ii}.calories`} label={ii === 0 ? 'kcal' : undefined} type="number" inputMode="numeric" placeholder="—" />
          <div className="cant-itemrow__veg">
            <FormToggle<MenuValues> name={`meals.${mealIndex}.items.${ii}.veg`} aria-label="Vegetarian" />
            <span className="cant-itemrow__veglabel">Veg</span>
          </div>
          <div className="cant-itemrow__rm">
            {fields.length > 1 && (
              <Button type="button" variant="ghost" size="sm" leftIcon="x" aria-label={`Remove item ${ii + 1}`} onClick={() => remove(ii)} />
            )}
          </div>
        </div>
      ))}

      <Button type="button" variant="ghost" size="sm" leftIcon="plus" onClick={() => append({ name: '', veg: true, calories: '' })} style={{ marginTop: 6 }}>
        Add dish
      </Button>
    </div>
  );
}

/* helpers to default a freshly-added meal to a type not already used */
const ALL_TYPES = MEAL_TYPE_OPTIONS.map((o) => o.value);
function watchMealType(m: Record<string, unknown>): string {
  return (m as { type?: string }).type ?? '';
}
function nextMealType(used: string[]): MenuValues['meals'][number]['type'] {
  const free = ALL_TYPES.find((t) => !used.includes(t));
  return (free ?? 'lunch') as MenuValues['meals'][number]['type'];
}
