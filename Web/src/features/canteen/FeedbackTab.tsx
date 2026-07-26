import { useMemo, useState } from 'react';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, Textarea } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useCanteenFeedback, createFeedback, type Actor } from '@/features/ops/data';
import { MEAL_TYPE_OPTIONS } from '@/features/ops/meta';
import type { MealType } from '@/types/ops';
import { mealLabel, todayISO } from './lib';

/** Static 1–5 rating display. `award` glyph (no `star` icon in the kit). */
function Stars({ value, size = 15, label }: { value: number; size?: number; label?: string }) {
  return (
    <span className="cant-stars" role="img" aria-label={label ?? `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="award" size={size} className={n <= Math.round(value) ? 'cant-star is-on' : 'cant-star'} />
      ))}
    </span>
  );
}

/** Interactive star picker (keyboard: radio-group semantics). */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="cant-starpick" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={`cant-starpick__btn${n <= value ? ' is-on' : ''}`} onClick={() => onChange(n)}>
          <Icon name="award" size={26} />
        </button>
      ))}
    </div>
  );
}

export function FeedbackTab() {
  const toast = useToast();
  const { schoolId, uid, member, role } = useSession();
  const canWrite = useOwnership('canteen').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: feedback, loading, error } = useCanteenFeedback(schoolId);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [meal, setMeal] = useState<string>('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const { avg, count, rows } = useMemo(() => {
    const sorted = feedback.slice().sort((a, b) => keyOf(b) - keyOf(a) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const rated = feedback.filter((f) => f.rating > 0);
    const mean = rated.length ? rated.reduce((s, f) => s + f.rating, 0) / rated.length : 0;
    return { avg: mean, count: rated.length, rows: sorted };
  }, [feedback]);

  const reset = () => { setDate(todayISO()); setMeal(''); setRating(0); setComment(''); };

  const submit = async () => {
    if (!schoolId || rating < 1) return;
    setBusy(true);
    try {
      await createFeedback(schoolId, {
        schoolId, date, mealType: (meal || undefined) as MealType | undefined, rating, comment: comment.trim() || undefined,
        byName: member?.name, byRole: role,
      }, actor);
      toast.success('Feedback added');
      setOpen(false);
      reset();
    } catch {
      toast.error('Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="award" label="Average rating" count={avg} format="plain" decimals={1} suffix=" / 5" subColor={avg >= 4 ? 'var(--success)' : avg && avg < 3 ? 'var(--danger)' : undefined}
          sub={count ? <Stars value={avg} size={12} /> : 'No ratings yet'} />
        <KPICard icon="message" label="Total reviews" count={count} format="us" />
      </div>

      <div className="nx-toolbar" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, flex: 1 }}>Ratings and comments from staff and families.</p>
        {canWrite && <Button variant="gold" leftIcon="plus" onClick={() => { reset(); setOpen(true); }}>Add feedback</Button>}
      </div>

      {error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load feedback" message="Please try again." /></Panel>
      ) : loading ? (
        <Skeleton height={180} />
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon="message" title="No feedback yet" message={canWrite ? 'Add the first review to start tracking satisfaction.' : 'Reviews will appear here.'} /></Panel>
      ) : (
        <div className="cant-list" style={{ gap: 10 }}>
          {rows.map((f) => (
            <Panel key={f.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Stars value={f.rating} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {f.mealType ? `${mealLabel(f.mealType)} · ` : ''}{f.date ? formatDate(`${f.date}T00:00:00`) : ''}
                </span>
              </div>
              {f.comment && <p style={{ fontSize: 13.5, margin: '8px 0 0' }}>{f.comment}</p>}
              {(f.byName || f.byRole) && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>— {f.byName ?? 'Anonymous'}{f.byRole ? ` · ${f.byRole}` : ''}</div>}
            </Panel>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => !busy && setOpen(false)} icon="message" tone="gold" title="Add feedback" size="md" dismissible={!busy}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="gold" leftIcon="check" loading={busy} disabled={rating < 1} onClick={submit}>Save</Button>
        </>}>
        <Field label="Rating" required>
          <StarPicker value={rating} onChange={setRating} />
        </Field>
        <div className="cant-modal-grid">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} /></Field>
          <Field label="Meal" optional><Select value={meal} onChange={(e) => setMeal(e.target.value)} placeholder="Any" options={MEAL_TYPE_OPTIONS} /></Field>
        </div>
        <Field label="Comment" optional><Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="What was good or could improve?" /></Field>
      </Modal>
    </div>
  );
}

const keyOf = (f: { date: string }) => new Date(`${f.date}T00:00:00`).getTime() || 0;
