import { useState } from 'react';
import { z } from 'zod';
import {
  Panel,
  Badge,
  Button,
  Modal,
  ConfirmModal,
  Sheet,
  Tabs,
  useToast,
  Field,
  Input,
  Textarea,
  Select,
  DatePicker,
  Toggle,
  Checkbox,
  RadioGroup,
  OTPInput,
  FileUpload,
  Form,
  FormInput,
  FormSelect,
  FormRadioGroup,
  FormToggle,
  FormPage,
  FormSection,
  FormRow,
  FormTextarea,
  FormDate,
} from '@/components';

/**
 * Interactive P0 kit smoke test: every form primitive (standalone + RHF/Zod
 * connected), the dedicated FormPage layout, and the overlay/nav kit (Modal,
 * ConfirmModal, Sheet, Tabs, Toast). Validates that the kit composes and behaves
 * before the feature modules consume it. Mounted at `/kit`.
 */

const demoSchema = z.object({
  fullName: z.string().min(2, 'Enter at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  grade: z.string().min(1, 'Select a grade'),
  gender: z.string().min(1, 'Select one'),
  dob: z.string().min(1, 'Pick a date of birth'),
  notes: z.string().optional(),
  consent: z.boolean(),
});
type DemoValues = z.infer<typeof demoSchema>;

export function KitPreview() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // standalone control states
  const [toggle, setToggle] = useState(true);
  const [check, setCheck] = useState(false);
  const [radio, setRadio] = useState('day');
  const [otp, setOtp] = useState('');
  const [date, setDate] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  return (
    <div className="nx-content" style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div className="greeting" style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>NEXLI Kit Preview</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 4 }}>
          Form kit · overlays · navigation — the P0 building blocks every module composes.
        </p>
      </div>

      {/* Overlays + toasts */}
      <Panel title="Overlays & feedback" headerRight={<Badge variant="success">interactive</Badge>}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Button variant="gold" leftIcon="bell" onClick={() => toast.success('Saved', 'Your changes are live.')}>
            Success toast
          </Button>
          <Button variant="ghost" onClick={() => toast.error('Upload failed', 'Check your connection and retry.')}>
            Error toast
          </Button>
          <Button
            variant="ghost"
            onClick={() => toast.toast({ title: 'Fee reminder sent', tone: 'info', action: { label: 'Undo', onClick: () => toast.info('Reverted') } })}
          >
            Toast w/ action
          </Button>
          <Button variant="subtle" leftIcon="eye" onClick={() => setModalOpen(true)}>
            Open modal
          </Button>
          <Button variant="danger" leftIcon="alert-triangle" onClick={() => setConfirmOpen(true)}>
            Confirm (destructive)
          </Button>
          <Button variant="subtle" leftIcon="menu" onClick={() => setSheetOpen(true)}>
            Bottom sheet
          </Button>
          <Button variant="subtle" leftIcon="settings" onClick={() => setDrawerOpen(true)}>
            Side drawer
          </Button>
        </div>
      </Panel>

      {/* Tabs */}
      <Panel title="Tabs">
        <Tabs
          aria-label="Demo tabs"
          tabs={[
            { id: 'overview', label: 'Overview', icon: 'dashboard' },
            { id: 'students', label: 'Students', icon: 'users', badge: 1284 },
            { id: 'fees', label: 'Fees', icon: 'wallet' },
            { id: 'archived', label: 'Archived', disabled: true },
          ]}
        >
          {(active) => (
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              Active panel: <strong style={{ color: 'var(--text)' }}>{active}</strong>. Arrow keys navigate; the
              underline animates via transform only.
            </p>
          )}
        </Tabs>
        <div style={{ marginTop: 16 }}>
          <Tabs
            variant="pill"
            aria-label="Pill tabs"
            tabs={[
              { id: 'day', label: 'Day' },
              { id: 'week', label: 'Week' },
              { id: 'month', label: 'Month' },
            ]}
          />
        </div>
      </Panel>

      {/* Standalone controls */}
      <Panel title="Form primitives (standalone)">
        <div className="nx-section__grid">
          <Field label="Search" hint="Leading icon + placeholder">
            <Input leftIcon="search" placeholder="Search students…" />
          </Field>
          <Field label="Amount" hint="Fixed prefix">
            <Input prefix="₹" inputMode="numeric" placeholder="0" />
          </Field>
          <Field label="Password" hint="Reveal toggle">
            <Input type="password" revealable placeholder="••••••••" />
          </Field>
          <Field label="Grade">
            <Select
              placeholder="Select grade"
              options={[
                { value: '1', label: 'Grade 1' },
                { value: '2', label: 'Grade 2' },
                { value: '3', label: 'Grade 3' },
              ]}
            />
          </Field>
          <Field label="Date of birth">
            <DatePicker value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Remarks" className="nx-col-full">
            <Textarea autoResize placeholder="Type a note…" />
          </Field>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 18, alignItems: 'flex-start' }}>
          <Toggle checked={toggle} onChange={setToggle} label="Email notifications" description="Daily digest at 7am" />
          <Checkbox checked={check} onChange={setCheck} label="I accept the terms" description="Required to continue" />
        </div>

        <div style={{ marginTop: 18, maxWidth: 360 }}>
          <Field label="Session type">
            <RadioGroup
              value={radio}
              onChange={setRadio}
              options={[
                { value: 'day', label: 'Day scholar', description: 'Commutes daily' },
                { value: 'boarding', label: 'Boarding', description: 'Resident in hostel' },
              ]}
            />
          </Field>
        </div>

        <div style={{ marginTop: 18 }}>
          <Field label="Verification code" hint="6-digit OTP — paste-fill & arrow keys">
            <OTPInput value={otp} onChange={setOtp} onComplete={(v) => toast.success('Code entered', v)} />
          </Field>
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 32 }}>
          <Field label="Profile photo (ImageKit seam)">
            <FileUpload kind="avatar" value={photo} onChange={setPhoto} fallbackName="Aarav Sharma" />
          </Field>
          <Field label="Attachment">
            <FileUpload kind="image" value={null} onChange={() => {}} buttonLabel="Upload cover image" />
          </Field>
        </div>
      </Panel>

      {/* Connected form (RHF + Zod) using FormPage layout */}
      <Panel title="Dedicated form page (RHF + Zod)" sub="validation-driven">
        <Form<DemoValues>
          schema={demoSchema}
          defaultValues={{ fullName: '', email: '', grade: '', gender: '', dob: '', notes: '', consent: false }}
          onSubmit={(values) => {
            toast.success('Form valid', `Welcome, ${values.fullName}`);
          }}
        >
          <FormPage
            title="New student"
            subtitle="A real dedicated-page form — sticky save bar, sectioned, mobile-first."
            breadcrumbs={[{ label: 'Students' }, { label: 'New' }]}
            submitLabel="Create student"
            submitIcon="check"
            onCancel={() => toast.info('Cancelled')}
          >
            <FormSection title="Identity" description="Basic details captured at admission.">
              <FormInput<DemoValues> name="fullName" label="Full name" required placeholder="e.g. Aarav Sharma" />
              <FormInput<DemoValues> name="email" label="Guardian email" required type="email" leftIcon="mail" placeholder="name@example.com" />
              <FormSelect<DemoValues>
                name="grade"
                label="Grade"
                required
                placeholder="Select grade"
                options={[
                  { value: '1', label: 'Grade 1' },
                  { value: '2', label: 'Grade 2' },
                  { value: '3', label: 'Grade 3' },
                ]}
              />
              <FormDate<DemoValues> name="dob" label="Date of birth" required />
              <FormRadioGroup<DemoValues>
                name="gender"
                label="Gender"
                required
                variant="inline"
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </FormSection>
            <FormSection title="Additional" single>
              <FormRow>
                <FormTextarea<DemoValues> name="notes" label="Notes" optional placeholder="Anything the school should know…" />
              </FormRow>
              <FormToggle<DemoValues> name="consent" label="Guardian consent on file (DPDP)" description="Required for data processing" />
            </FormSection>
          </FormPage>
        </Form>
      </Panel>

      {/* ---- overlays ---- */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        icon="info"
        tone="gold"
        title="Preview dialog"
        description="Focus-trapped, Escape & backdrop close, scroll-locked, animated. Becomes a bottom sheet under 480px."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Close
            </Button>
            <Button variant="gold" onClick={() => setModalOpen(false)}>
              Got it
            </Button>
          </>
        }
      >
        <p>Use modals for confirm / preview / warn / simple edits — major data entry lives on dedicated pages.</p>
      </Modal>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        tone="danger"
        title="Terminate subscription?"
        message="The school will lose access at the end of the billing period. This can be undone before then."
        confirmLabel="Terminate"
        loading={confirmBusy}
        onConfirm={() => {
          setConfirmBusy(true);
          setTimeout(() => {
            setConfirmBusy(false);
            setConfirmOpen(false);
            toast.success('Subscription terminated');
          }, 900);
        }}
      />

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        description="Bottom sheet on phones, drawer on desktop."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              Reset
            </Button>
            <Button variant="gold" onClick={() => setSheetOpen(false)}>
              Apply
            </Button>
          </>
        }
      >
        <div className="nx-section__grid nx-section__grid--single">
          <Field label="Status">
            <Select placeholder="Any" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </Field>
          <Checkbox checked={check} onChange={setCheck} label="Only with dues" />
        </div>
      </Sheet>

      <Sheet open={drawerOpen} onClose={() => setDrawerOpen(false)} side="right" title="Student detail" size="md">
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
          A right-side drawer for quick peek / secondary flows without leaving the list.
        </p>
      </Sheet>
    </div>
  );
}
