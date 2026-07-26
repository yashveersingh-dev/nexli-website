import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { Field } from '@/components/form';
import { Icon } from '@/components/Icon';

interface ChipListFieldProps {
  name: string;
  label?: ReactNode;
  hint?: ReactNode;
  placeholder?: string;
}

/**
 * RHF-connected chip list for a `string[]` value. Type a value and press Enter
 * or comma to add; click the × (or Backspace on an empty input) to remove.
 * Mirrors the shared student-form / medical array pattern.
 */
export function ChipListField<T extends FieldValues = FieldValues>({
  name,
  label,
  hint,
  placeholder,
}: ChipListFieldProps) {
  const { control } = useFormContext<T>();
  const [draft, setDraft] = useState('');
  const id = `f-${name}`;

  return (
    <Controller
      control={control}
      name={name as Path<T>}
      render={({ field, fieldState }) => {
        const items: string[] = Array.isArray(field.value) ? field.value : [];

        const add = (raw: string) => {
          const value = raw.trim();
          if (!value) return;
          if (items.some((x) => x.toLowerCase() === value.toLowerCase())) {
            setDraft('');
            return;
          }
          field.onChange([...items, value]);
          setDraft('');
        };
        const removeAt = (i: number) => field.onChange(items.filter((_, idx) => idx !== i));

        const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(draft);
          } else if (e.key === 'Backspace' && draft === '' && items.length > 0) {
            removeAt(items.length - 1);
          }
        };

        return (
          <Field label={label} htmlFor={id} hint={hint} error={fieldState.error?.message}>
            <div className="sped-chips" data-invalid={fieldState.invalid || undefined}>
              {items.map((item, i) => (
                <span className="sped-chip" key={`${item}-${i}`}>
                  <span className="sped-chip__label">{item}</span>
                  <button
                    type="button"
                    className="sped-chip__remove"
                    aria-label={`Remove ${item}`}
                    onClick={() => removeAt(i)}
                    onBlur={field.onBlur}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </span>
              ))}
              <input
                id={id}
                className="sped-chips__input"
                value={draft}
                placeholder={items.length === 0 ? placeholder : undefined}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={() => {
                  add(draft);
                  field.onBlur();
                }}
                aria-describedby={`${id}-msg`}
                autoComplete="off"
              />
            </div>
          </Field>
        );
      }}
    />
  );
}
