import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { updateScheme, type Actor } from './data';
import {
  GRADING_SYSTEM_META, GRADING_SYSTEM_OPTIONS, defaultBandsFor, gradingSystemOf, isDirectGradeSystem,
} from './schemes';
import type {
  ReportCardGradeBand, ReportCardGradingSystem, ReportCardScheme,
} from '@/types/reportcard';

/**
 * Per-scheme grading-system editor. Lets a school choose how a scheme grades:
 *   • marks       — numeric marks → % → grade (the grade BANDS define the cutoffs)
 *   • grade_abcd  — A/B/C/D direct grades (symbols + optional descriptions)
 *   • grade_a1b1  — CBSE A1…D direct grades (preset symbols, editable copy/ranges)
 *   • grade_custom— user-defined symbols + labels
 * The grade-band editor is shown for every system, but its shape adapts: 'marks'
 * keeps the marks-range columns; direct-grade systems lead with the symbol +
 * description (ranges stay editable but optional). Persists via `updateScheme`.
 */
export function GradingSystemModal({
  open,
  scheme,
  onClose,
}: {
  open: boolean;
  scheme: ReportCardScheme | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const actor: Actor = { uid: uid ?? 'unknown', name: member?.name };

  const [system, setSystem] = useState<ReportCardGradingSystem>('marks');
  const [bands, setBands] = useState<ReportCardGradeBand[]>([]);
  const [saving, setSaving] = useState(false);

  // Re-hydrate whenever a different scheme is opened.
  useEffect(() => {
    if (!scheme) return;
    setSystem(gradingSystemOf(scheme));
    setBands((scheme.gradeBands ?? []).map((b) => ({ ...b })));
  }, [scheme]);

  if (!scheme) return null;

  const direct = isDirectGradeSystem(system);
  const showRanges = !direct; // marks: ranges drive grading; direct: symbol-led

  const pickSystem = (next: ReportCardGradingSystem) => {
    setSystem(next);
    // Reset bands to the new system's sensible defaults (keeps custom edits).
    setBands(defaultBandsFor(next, bands));
  };

  const num = (s: string): number => {
    const n = Number(s);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  };

  const setBand = (i: number, patch: Partial<ReportCardGradeBand>) =>
    setBands((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const addBand = () =>
    setBands((prev) => [...prev, { grade: '', minPct: 0, maxPct: 100, description: '' }]);
  const removeBand = (i: number) => setBands((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!schoolId) return;
    // Drop blank-symbol rows; never persist an empty band set.
    const clean = bands
      .map((b) => ({
        grade: b.grade.trim(),
        minPct: b.minPct,
        maxPct: b.maxPct,
        ...(b.point != null ? { point: b.point } : {}),
        ...(b.description?.trim() ? { description: b.description.trim() } : {}),
      }))
      .filter((b) => b.grade);
    if (clean.length === 0) {
      toast.error('Add at least one grade', 'Define one or more grade symbols before saving.');
      return;
    }
    setSaving(true);
    try {
      await updateScheme(schoolId, scheme.id, { gradingSystem: system, gradeBands: clean }, actor);
      toast.success('Grading system updated', scheme.name);
      onClose();
    } catch {
      toast.error('Could not update', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      size="lg"
      icon="edit"
      tone="gold"
      title="Grading system"
      description={scheme.name}
      dismissible={!saving}
      hideClose={saving}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" variant="gold" loading={saving} onClick={save}>Save grading</Button>
        </>
      }
    >
      <Field label="Grading system" htmlFor="rc-grading-system">
        <Select
          id="rc-grading-system"
          value={system}
          options={GRADING_SYSTEM_OPTIONS}
          onChange={(e) => pickSystem(e.target.value as ReportCardGradingSystem)}
        />
      </Field>
      <p className="rc-note" style={{ marginTop: 4 }}>{GRADING_SYSTEM_META[system].hint}</p>

      <div className="rc-doc__section-title" style={{ marginTop: 14 }}>
        {system === 'marks' ? 'Grade bands' : 'Grade symbols'}
      </div>

      <div className={`rc-bandedit ${showRanges ? '' : 'rc-bandedit--symbols'}`}>
        <div className="rc-bandedit__head" aria-hidden="true">
          <span>Symbol</span>
          {showRanges && <><span>Min %</span><span>Max %</span></>}
          <span>{direct ? 'Description' : 'Label / description'}</span>
          <span />
        </div>
        {bands.map((b, i) => (
          <div className="rc-bandedit__row" key={i}>
            <Input
              size="sm"
              value={b.grade}
              placeholder={direct ? 'e.g. A1' : 'e.g. A'}
              aria-label={`Grade symbol ${i + 1}`}
              onChange={(e) => setBand(i, { grade: e.target.value })}
            />
            {showRanges && (
              <>
                <Input
                  size="sm" type="number" inputMode="numeric" min={0} max={100}
                  value={String(b.minPct)} aria-label={`Min percent for ${b.grade || `row ${i + 1}`}`}
                  onChange={(e) => setBand(i, { minPct: num(e.target.value) })}
                />
                <Input
                  size="sm" type="number" inputMode="numeric" min={0} max={100}
                  value={String(b.maxPct)} aria-label={`Max percent for ${b.grade || `row ${i + 1}`}`}
                  onChange={(e) => setBand(i, { maxPct: num(e.target.value) })}
                />
              </>
            )}
            <Input
              size="sm"
              value={b.description ?? ''}
              placeholder={direct ? 'e.g. Excellent' : 'Optional label'}
              aria-label={`Description for ${b.grade || `row ${i + 1}`}`}
              onChange={(e) => setBand(i, { description: e.target.value })}
            />
            <Button
              variant="ghost" size="sm" leftIcon="minus-circle"
              aria-label={`Remove grade ${b.grade || i + 1}`}
              onClick={() => removeBand(i)}
            />
          </div>
        ))}
      </div>

      <Button variant="ghost" size="sm" leftIcon="plus" onClick={addBand} style={{ marginTop: 6 }}>
        Add grade
      </Button>
    </Modal>
  );
}
