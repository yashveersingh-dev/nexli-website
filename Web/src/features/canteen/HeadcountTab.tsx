import { useMemo, useState } from 'react';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import { tenantDoc } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import { KPICard } from '@/components/KPICard';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Field, Input, Select } from '@/components/form';
import { EmptyState, Skeleton } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { useHeadcounts, type Actor } from '@/features/ops/data';
import { MEAL_TYPE_META, MEAL_TYPE_OPTIONS } from '@/features/ops/meta';
import type { MealHeadcount, MealType } from '@/types/ops';
import { mealLabel, todayISO } from './lib';

/** Monday-anchored start of the current week (local). */
function weekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

export function HeadcountTab() {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const canWrite = useOwnership('canteen').canOperate;
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };
  const { data: headcounts, loading, error } = useHeadcounts(schoolId);

  const [date, setDate] = useState(todayISO());
  const [meal, setMeal] = useState<MealType>('lunch');
  const [count, setCount] = useState('');
  const [busy, setBusy] = useState(false);

  const countNum = Number(count);
  const valid = count.trim() !== '' && Number.isFinite(countNum) && countNum >= 0 && countNum <= 100000;

  // One headcount per date+meal: the doc id is deterministic (`${date}_${mealType}`)
  // so re-recording the same slot OVERWRITES rather than appending a duplicate (which
  // previously double-counted the weekly KPI). Surface any existing value so the
  // operator knows they're amending an existing entry.
  const dupe = useMemo(
    () => headcounts.find((h) => h.date === date && h.mealType === meal),
    [headcounts, date, meal],
  );

  const submit = async () => {
    if (!schoolId || !valid) return;
    setBusy(true);
    try {
      // Deterministic upsert: re-entry for the same date+meal replaces the count
      // instead of creating a second doc, so the weekly total can't be doubled.
      const id = `${date}_${meal}`;
      await setDoc(
        tenantDoc(schoolId, 'meal_headcount', id),
        {
          schoolId, date, mealType: meal, count: Math.round(countNum),
          ...(member?.name ? { recordedByName: member.name } : {}),
          lastModifiedAt: Date.now(), lastModifiedBy: actor.uid, serverModifiedAt: serverTimestamp(),
        },
        { merge: true },
      );
      void writeAuditEvent({ action: 'canteen.headcount', schoolId, actor, targetType: 'headcount', targetId: id, summary: `${mealLabel(meal)} ${date}: ${Math.round(countNum)}` });
      toast.success(dupe ? 'Headcount updated' : 'Headcount recorded', `${mealLabel(meal)} · ${Math.round(countNum)}`);
      setCount('');
    } catch {
      toast.error('Could not save');
    } finally {
      setBusy(false);
    }
  };

  const { weekByMeal, weekTotal, recent } = useMemo(() => {
    const ws = weekStart().getTime();
    const inWeek = headcounts.filter((h) => {
      const t = new Date(`${h.date}T00:00:00`).getTime();
      return Number.isFinite(t) && t >= ws;
    });
    const byMeal = new Map<MealType, number>();
    let total = 0;
    for (const h of inWeek) {
      byMeal.set(h.mealType, (byMeal.get(h.mealType) ?? 0) + (h.count ?? 0));
      total += h.count ?? 0;
    }
    const sorted = headcounts
      .slice()
      .sort((a, b) => keyOf(b) - keyOf(a) || (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 12);
    return { weekByMeal: byMeal, weekTotal: total, recent: sorted };
  }, [headcounts]);

  return (
    <div>
      <div className="kpi-grid">
        <KPICard icon="users" label="Meals served this week" count={weekTotal} format="us" subColor={weekTotal ? 'var(--gold)' : undefined} />
        {MEAL_TYPE_OPTIONS.filter((o) => weekByMeal.get(o.value as MealType)).slice(0, 2).map((o) => (
          <KPICard key={o.value} icon={MEAL_TYPE_META[o.value as MealType].icon} label={`${o.label} this week`} count={weekByMeal.get(o.value as MealType) ?? 0} format="us" />
        ))}
      </div>

      {canWrite && (
        <Panel title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="plus" size={15} /> Record headcount</span>} className="cant-quick">
          <div className="cant-quick__grid">
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} /></Field>
            <Field label="Meal"><Select value={meal} onChange={(e) => setMeal(e.target.value as MealType)} options={MEAL_TYPE_OPTIONS} /></Field>
            <Field label="Count">
              <Input type="number" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} placeholder="0" min={0}
                invalid={count.trim() !== '' && !valid} onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }} />
            </Field>
            <div className="cant-quick__action">
              <Button variant="gold" leftIcon="check" loading={busy} disabled={!valid} onClick={submit} block>Record</Button>
            </div>
          </div>
          {dupe && (
            <p style={{ fontSize: 11.5, color: 'var(--warning)', margin: '8px 0 0', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name="alert-triangle" size={13} /> {mealLabel(meal)} on this date is already recorded as {dupe.count}. Recording again replaces it with the new count.
            </p>
          )}
        </Panel>
      )}

      <h2 className="cant-subhead">Recent entries</h2>
      {error ? (
        <Panel><EmptyState icon="alert-triangle" title="Couldn't load headcounts" message="Please try again." /></Panel>
      ) : loading ? (
        <Skeleton height={160} />
      ) : recent.length === 0 ? (
        <Panel><EmptyState icon="users" title="No headcounts yet" message={canWrite ? 'Record a meal headcount above to start tracking.' : 'Recorded counts will appear here.'} /></Panel>
      ) : (
        <div className="cant-list" style={{ gap: 8 }}>
          {recent.map((h) => (
            <RecentRow key={h.id} h={h} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecentRow({ h }: { h: MealHeadcount }) {
  return (
    <Panel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="cant-mealicon" aria-hidden="true"><Icon name={MEAL_TYPE_META[h.mealType].icon} size={16} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{mealLabel(h.mealType)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {h.date ? formatDate(`${h.date}T00:00:00`) : '—'}{h.recordedByName ? ` · ${h.recordedByName}` : ''}
          </div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{h.count}</div>
      </div>
    </Panel>
  );
}

const keyOf = (h: MealHeadcount) => new Date(`${h.date}T00:00:00`).getTime() || 0;
