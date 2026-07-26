import { Panel } from '@/components/Panel';
import { Icon } from '@/components/Icon';

/**
 * Compact "how this works" step indicator for the procurement chain.
 * Pure signposting — no state, no actions. Explains the order of operations
 * and who is responsible for each step so the workflow is obvious at a glance.
 */
const STEPS: { title: string; who: string }[] = [
  { title: 'Raise requisition', who: 'Any staff' },
  { title: 'Approve', who: 'VP / Principal' },
  { title: 'Create PO', who: 'Accounts' },
  { title: 'Receive goods', who: 'Accounts' },
  { title: 'Record expense', who: 'Accounts' },
];

export function ExpenseFlow({ title = 'How procurement works' }: { title?: string }) {
  return (
    <Panel title={title} sub="Requisition → expense">
      <ol className="exp-flow">
        {STEPS.map((s, i) => (
          <li className="exp-flow__step" key={s.title}>
            <span className="exp-flow__num" aria-hidden="true">{i + 1}</span>
            <span className="exp-flow__body">
              <span className="exp-flow__title">{s.title}</span>
              <span className="exp-flow__who">{s.who}</span>
            </span>
          </li>
        ))}
      </ol>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="info" size={13} aria-hidden="true" />
        Any staff member can raise a requisition; Accounts handle POs and expenses; VP / Principal approve.
      </p>
    </Panel>
  );
}
