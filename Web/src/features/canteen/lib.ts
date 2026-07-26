import { MEAL_TYPE_META, MEAL_TYPE_OPTIONS } from '@/features/ops/meta';
import type { MealType } from '@/types/ops';
import { WEEKDAY_LABEL } from './menuSchema';

/** Canonical meal order for stable display (matches MEAL_TYPE_META key order). */
export const MEAL_ORDER = MEAL_TYPE_OPTIONS.map((o) => o.value) as MealType[];

export const mealLabel = (t: MealType) => MEAL_TYPE_META[t].label;

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const todayWeekday = () => new Date().getDay();

/** Sort meals into the canonical order regardless of stored order. */
export function sortMeals<T extends { type: MealType }>(meals: T[]): T[] {
  return meals.slice().sort((a, b) => MEAL_ORDER.indexOf(a.type) - MEAL_ORDER.indexOf(b.type));
}

/** Human label for a menu's scope (date or weekday template). */
export function menuScopeLabel(m: { date?: string; weekday?: number }): string {
  if (m.date) {
    const d = new Date(`${m.date}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? m.date
      : d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (m.weekday != null) return `Every ${WEEKDAY_LABEL(m.weekday) ?? 'weekday'}`;
  return 'Untitled menu';
}

export const totalItems = (m: { meals: { items: unknown[] }[] }) => m.meals.reduce((s, meal) => s + meal.items.length, 0);
