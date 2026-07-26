import { z } from 'zod';
import type { CanteenMenu, MealType, MealItem } from '@/types/ops';

/**
 * Form schemas are string-based (input === output) so they satisfy the kit's
 * `Form<T>` (`ZodType<T>`); numbers are coerced at submit. Avoids `z.coerce`/
 * `.default()` which diverge input/output types. Mirrors `feeSchema.ts`.
 */

const itemSchema = z.object({
  name: z.string().trim().min(1, 'Name the dish'),
  veg: z.boolean(),
  calories: z.string().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 5000), 'Enter calories 0–5000'),
});

const mealSchema = z.object({
  type: z.enum(['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner']),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

export const menuSchema = z
  .object({
    /** 'date' = a dated daily menu; 'weekday' = a reusable weekly template. */
    scope: z.enum(['date', 'weekday']),
    date: z.string(),
    weekday: z.enum(['0', '1', '2', '3', '4', '5', '6']),
    meals: z.array(mealSchema).min(1, 'Add at least one meal'),
    notes: z.string().trim().optional(),
    published: z.boolean(),
  })
  .refine((v) => v.scope !== 'date' || v.date.trim() !== '', {
    message: 'Pick a date',
    path: ['date'],
  });

export type MenuValues = z.infer<typeof menuSchema>;

const today = () => new Date().toISOString().slice(0, 10);

export const emptyMenu = (): MenuValues => ({
  scope: 'date',
  date: today(),
  weekday: '1',
  meals: [{ type: 'lunch', items: [{ name: '', veg: true, calories: '' }] }],
  notes: '',
  published: false,
});

export function toMenuForm(m: CanteenMenu): MenuValues {
  const scope: MenuValues['scope'] = m.date ? 'date' : 'weekday';
  return {
    scope,
    date: m.date ?? today(),
    weekday: (String(m.weekday ?? 1) as MenuValues['weekday']),
    meals: m.meals.length
      ? m.meals.map((meal) => ({
          type: meal.type,
          items: meal.items.length
            ? meal.items.map((it) => ({ name: it.name, veg: it.veg !== false, calories: it.calories != null ? String(it.calories) : '' }))
            : [{ name: '', veg: true, calories: '' }],
        }))
      : emptyMenu().meals,
    notes: m.notes ?? '',
    published: m.published === true,
  };
}

/** Build the Firestore payload from validated form values. */
export function menuFromForm(values: MenuValues): Omit<CanteenMenu, 'id' | 'schoolId'> {
  return {
    date: values.scope === 'date' ? values.date.trim() : undefined,
    weekday: values.scope === 'weekday' ? Number(values.weekday) : undefined,
    meals: values.meals.map((meal) => ({
      type: meal.type as MealType,
      // `calories` is omitted entirely (not set to undefined) when blank — the
      // data layer's stripUndefined is shallow, so a nested `undefined` would
      // otherwise reach Firestore and throw on write.
      items: meal.items.map((it) => {
        const item: MealItem = { name: it.name.trim(), veg: it.veg };
        if (it.calories.trim() !== '') item.calories = Number(it.calories);
        return item;
      }),
    })),
    notes: values.notes?.trim() || undefined,
    published: values.published,
  };
}

export const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export const WEEKDAY_LABEL = (d?: number) => (d != null ? WEEKDAY_OPTIONS.find((o) => o.value === String(d))?.label : undefined);

export const MENU_SCOPE_OPTIONS = [
  { value: 'date', label: 'Specific date' },
  { value: 'weekday', label: 'Weekly template (weekday)' },
];
