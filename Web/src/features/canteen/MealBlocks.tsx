import { Icon } from '@/components/Icon';
import { MEAL_TYPE_META } from '@/features/ops/meta';
import type { CanteenMenu } from '@/types/ops';
import { mealLabel, sortMeals } from './lib';

/**
 * Renders a menu's meals using the shared ops menu classes
 * (`ops-menu-day` / `ops-meal` / `ops-veg`). Veg = green dot, non-veg = red.
 */
export function MealBlocks({ menu }: { menu: Pick<CanteenMenu, 'meals'> }) {
  const meals = sortMeals(menu.meals);
  if (meals.length === 0) return null;
  return (
    <div className="ops-menu-day">
      {meals.map((meal) => (
        <div className="ops-meal" key={meal.type}>
          <div className="ops-meal__head" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name={MEAL_TYPE_META[meal.type].icon} size={13} />
            {mealLabel(meal.type)}
          </div>
          {meal.items.length === 0 ? (
            <div className="ops-meal__item" style={{ color: 'var(--text-muted)' }}>No items</div>
          ) : (
            meal.items.map((it, i) => (
              <div className="ops-meal__item" key={i}>
                <span className={`ops-veg${it.veg === false ? ' is-nonveg' : ''}`} aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  {it.name}
                  <span className="nx-sr-only">{it.veg === false ? ' (non-vegetarian)' : ' (vegetarian)'}</span>
                </span>
                {it.calories != null && (
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', flexShrink: 0 }}>{it.calories} kcal</span>
                )}
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
