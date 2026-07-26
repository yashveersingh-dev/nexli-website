import { useMemo, useState } from 'react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { RadioGroup } from '@/components/form';
import type { AnswerMap, AssessmentProfile } from '@/types/career';
import { ASSESSMENT_ITEMS, LIKERT_SCALE, AB_LABELS, TOTAL_ITEMS } from './bank';
import { scoreAssessment } from './scoring';

/** How many items per screen, so the assessment is chunked, not a wall of questions. */
const CHUNK = 6;

interface Props {
  onSubmit: (answers: AnswerMap, profile: AssessmentProfile) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * The student-facing assessment runner. Steps through the bank `CHUNK` items at a
 * time with a progress bar; a chunk can only be advanced once its items are answered.
 * On the final step it computes the deterministic profile and hands both the raw
 * answers and the profile to `onSubmit` (which persists the attempt).
 */
export function TakeAssessment({ onSubmit, submitting }: Props) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [step, setStep] = useState(0);

  const chunks = useMemo(() => {
    const out: (typeof ASSESSMENT_ITEMS)[number][][] = [];
    for (let i = 0; i < ASSESSMENT_ITEMS.length; i += CHUNK) {
      out.push(ASSESSMENT_ITEMS.slice(i, i + CHUNK) as (typeof ASSESSMENT_ITEMS)[number][]);
    }
    return out;
  }, []);

  const answeredCount = Object.keys(answers).length;
  const pct = Math.round((answeredCount / TOTAL_ITEMS) * 100);
  const current = chunks[step];
  const isLast = step === chunks.length - 1;
  const chunkComplete = current.every((item) => answers[item.id] !== undefined);

  const setLikert = (id: string, value: number) => setAnswers((a) => ({ ...a, [id]: value }));
  const setAb = (id: string, value: 'a' | 'b') => setAnswers((a) => ({ ...a, [id]: value }));

  const submit = async () => {
    const profile = scoreAssessment(answers);
    await onSubmit(answers, profile);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <strong>Section {step + 1} of {chunks.length}</strong>
          <Badge variant="info">{current[0]?.section === 'interest' ? 'Interests' : 'Aptitude'}</Badge>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{answeredCount}/{TOTAL_ITEMS} answered</span>
        </div>
        <div style={{ marginTop: 10, height: 8, borderRadius: 6, background: 'var(--border, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: 'var(--gold, #d4af37)', transition: 'width .3s ease' }} />
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
          {current[0]?.section === 'interest'
            ? 'How much would you enjoy each activity? Answer honestly — there are no right or wrong answers.'
            : 'Pick the option that fits you better. Both are fine — choose the one that feels more like you.'}
        </p>
      </Panel>

      {current.map((item) => (
        <Panel key={item.id}>
          <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 10 }}>{item.prompt}</div>
          {item.format === 'likert' ? (
            <RadioGroup
              aria-label={item.prompt}
              variant="inline"
              value={answers[item.id] !== undefined ? String(answers[item.id]) : ''}
              onChange={(v) => setLikert(item.id, Number(v))}
              options={LIKERT_SCALE.map((s) => ({ value: String(s.value), label: s.label }))}
            />
          ) : (
            <RadioGroup
              aria-label={item.prompt}
              variant="card"
              value={answers[item.id] !== undefined ? String(answers[item.id]) : ''}
              onChange={(v) => setAb(item.id, v as 'a' | 'b')}
              options={[
                { value: 'a', label: AB_LABELS[item.id]?.a ?? 'Option A' },
                { value: 'b', label: AB_LABELS[item.id]?.b ?? 'Option B' },
              ]}
            />
          )}
        </Panel>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Button variant="ghost" leftIcon="chevron-left" disabled={step === 0 || submitting} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </Button>
        {!chunkComplete && (
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="info" size={13} /> Answer all questions on this screen to continue
          </span>
        )}
        {isLast ? (
          <Button variant="gold" leftIcon="check" loading={submitting} disabled={!chunkComplete} onClick={submit}>
            Submit &amp; see my result
          </Button>
        ) : (
          <Button variant="gold" rightIcon="chevron-right" disabled={!chunkComplete} onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
