import { Panel } from '@/components/Panel';
import { Icon, type IconName } from '@/components/Icon';
import { AILockedOverlay } from '@/components/AILockedOverlay';
import type { RoleId } from '@/types/roles';

/**
 * A single assistant tool, shown as an honest "coming soon" preview card. The
 * card describes what the tool will do once a NEXLI AI model is connected; it
 * renders no fabricated draft text, sample outputs or decorative controls that
 * imply the tool is functional. The <AILockedOverlay> veil is kept for visual
 * consistency only.
 */
function ToolCard({ icon, title, desc, veilTitle }: { icon: IconName; title: string; desc: string; veilTitle: string }) {
  return (
    <Panel headerRight={<span className="nx-navtag">AI</span>}>
      <AILockedOverlay title={veilTitle}>
        <div className="in-preview__card in-preview__card--tool">
          <span className="in-preview__icon">
            <Icon name={icon} size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="in-preview__title">{title}</div>
            <div className="in-preview__desc">{desc}</div>
          </div>
        </div>
      </AILockedOverlay>
    </Panel>
  );
}

/**
 * Assistants — writing/optimisation tools (report-comment generator, announcement
 * drafter, timetable optimiser, answer-script insights).
 *
 * No AI provider is wired yet (see NEXLI_BUILD_PLAN.md §13A), so each tool is
 * presented as an honest preview describing what it WILL produce. Previously this
 * tab rendered fabricated draft remarks, a sample announcement and invented
 * topic-accuracy figures behind a blur; those have been removed so nothing here
 * can be mistaken for a real or generated result.
 */
export function AssistantsTab({ role }: { role?: RoleId }) {
  // Teaching roles get the classroom tools framed for them; other staff still
  // see the full catalogue (it's fine to present everything as upcoming).
  const isTeacher =
    role === 'class_teacher' || role === 'subject_teacher' || role === 'substitute_teacher' || role === 'hod';

  return (
    <div className="in-tools">
      <ToolCard
        icon="edit"
        title="Report-comment generator"
        veilTitle="Report comments"
        desc={
          isTeacher
            ? 'Will turn a student and a chosen tone into a polished, personalised report-card remark you can refine before saving.'
            : 'A teacher tool: will draft a personalised report-card remark from a student and a chosen tone.'
        }
      />

      <ToolCard
        icon="megaphone"
        title="Announcement drafter"
        veilTitle="Announcement drafter"
        desc="Will turn a short note into a clear, parent-friendly announcement for the audience you pick."
      />

      <ToolCard
        icon="calendar"
        title="Timetable optimiser"
        veilTitle="Timetable optimiser"
        desc="Will scan a section's timetable for clashes and suggest a more balanced weekly schedule."
      />

      <ToolCard
        icon="file-text"
        title="Answer-script insights"
        veilTitle="Answer-script insights"
        desc="Will summarise common mistakes and topic gaps across a graded assessment to guide re-teaching."
      />
    </div>
  );
}
