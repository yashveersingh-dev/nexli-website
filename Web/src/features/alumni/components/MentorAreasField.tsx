import { useState, type KeyboardEvent } from 'react';
import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { Field } from '@/components/form';
import { Input } from '@/components/form';
import { Icon } from '@/components/Icon';
import { MENTOR_AREA_SUGGESTIONS } from '../meta';

interface MentorAreasFieldProps<T extends FieldValues> {
  name: Path<T>;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Controlled chip list for `mentorAreas` (string[]). Add via Enter / comma or a
 * suggestion button; remove via the chip's × (or Backspace on an empty input).
 * Mirrors the RHF-connected field pattern used across the form kit.
 */
export function MentorAreasField<T extends FieldValues>({
  name,
  label = 'Mentorship focus areas',
  hint = 'Press Enter or comma to add. These power the mentorship board grouping.',
  disabled,
}: MentorAreasFieldProps<T>) {
  const { control } = useFormContext<T>();
  const [draft, setDraft] = useState('');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const values: string[] = Array.isArray(field.value) ? (field.value as string[]) : [];

        const add = (raw: string) => {
          const v = raw.trim();
          if (!v) return;
          const exists = values.some((x) => x.toLowerCase() === v.toLowerCase());
          if (!exists) field.onChange([...values, v]);
          setDraft('');
        };
        const removeAt = (i: number) => field.onChange(values.filter((_, idx) => idx !== i));

        const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(draft);
          } else if (e.key === 'Backspace' && draft === '' && values.length) {
            removeAt(values.length - 1);
          }
        };

        return (
          <Field
            label={label}
            hint={fieldState.error ? undefined : hint}
            error={fieldState.error?.message}
            className="nx-col-full"
          >
            {values.length > 0 && (
              <div className="al-chips">
                {values.map((area, i) => (
                  <span className="al-chip" key={`${area}-${i}`}>
                    {area}
                    {!disabled && (
                      <button
                        type="button"
                        className="al-chip__remove"
                        onClick={() => removeAt(i)}
                        aria-label={`Remove ${area}`}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            <Input
              value={draft}
              disabled={disabled}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={() => add(draft)}
              leftIcon="plus"
              placeholder="Add a focus area…"
              aria-label="Add mentorship focus area"
            />

            {!disabled && (
              <div className="al-suggest" role="group" aria-label="Suggested focus areas">
                {MENTOR_AREA_SUGGESTIONS.map((s) => {
                  const picked = values.some((x) => x.toLowerCase() === s.toLowerCase());
                  return (
                    <button
                      key={s}
                      type="button"
                      className="al-suggest__btn"
                      disabled={picked}
                      onClick={() => add(s)}
                    >
                      {picked ? '✓ ' : '+ '}
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>
        );
      }}
    />
  );
}
