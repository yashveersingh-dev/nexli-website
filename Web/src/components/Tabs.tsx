import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/Icon';

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: IconName;
  /** Small count/badge after the label. */
  badge?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Controlled active id. */
  value?: string;
  /** Uncontrolled initial id. */
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** 'line' (underline) | 'pill' (segmented). */
  variant?: 'line' | 'pill';
  /** Render the panel for the active tab. */
  children?: (activeId: string) => ReactNode;
  /** Accessible name for the tablist. */
  'aria-label'?: string;
  className?: string;
}

/**
 * Accessible tabs (WAI-ARIA tabs pattern): roving tabindex, Arrow/Home/End
 * navigation, manual activation. Scrolls horizontally without clipping on phones.
 */
export function Tabs({
  tabs,
  value,
  defaultValue,
  onChange,
  variant = 'line',
  children,
  className,
  ...aria
}: TabsProps) {
  const reactId = useId();
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.id);
  const active = value ?? internal;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onChange?.(id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabled = tabs.map((t, i) => ({ t, i })).filter(({ t }) => !t.disabled);
    const pos = enabled.findIndex(({ i }) => i === index);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (pos + 1) % enabled.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (pos - 1 + enabled.length) % enabled.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = enabled.length - 1;
    if (next >= 0) {
      e.preventDefault();
      const target = enabled[next].i;
      refs.current[target]?.focus();
      select(tabs[target].id);
    }
  };

  return (
    <div className={cn('nx-tabs', `nx-tabs--${variant}`, className)}>
      <div className="nx-tabs__list" role="tablist" aria-label={aria['aria-label']}>
        {tabs.map((t, i) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${reactId}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${reactId}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={t.disabled}
              className={cn('nx-tabs__tab', selected && 'is-active')}
              onClick={() => select(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {t.icon && <Icon name={t.icon} size={15} />}
              <span>{t.label}</span>
              {t.badge != null && <span className="nx-tabs__badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>
      {children && (
        <div
          role="tabpanel"
          id={`${reactId}-panel-${active}`}
          aria-labelledby={`${reactId}-tab-${active}`}
          className="nx-tabs__panel"
          tabIndex={0}
        >
          {children(active)}
        </div>
      )}
    </div>
  );
}
