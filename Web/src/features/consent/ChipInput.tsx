import { useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/Icon';

interface ChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  'aria-label'?: string;
  id?: string;
}

/**
 * Comma/Enter-separated chip list for free-text tags (used for a purpose's data
 * categories). Backspace on an empty field removes the last chip.
 */
export function ChipInput({ value, onChange, placeholder, id, ...aria }: ChipInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="cns-chipinput">
      {value.map((chip, i) => (
        <span key={`${chip}-${i}`} className="cns-chip">
          {chip}
          <button type="button" className="cns-chip__x" aria-label={`Remove ${chip}`} onClick={() => remove(i)}>
            <Icon name="x" size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        className="cns-chipinput__field"
        value={draft}
        placeholder={value.length ? '' : placeholder}
        aria-label={aria['aria-label']}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
      />
    </div>
  );
}
