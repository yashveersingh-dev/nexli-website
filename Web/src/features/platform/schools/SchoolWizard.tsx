import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { setDoc } from 'firebase/firestore';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { cn } from '@/lib/cn';
import {
  Field,
  Input,
  Select,
  DatePicker,
  Toggle,
  RadioGroup,
} from '@/components/form';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { schoolFlagsRef } from '@/lib/db';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { createSchool, updateSchool } from '@/features/platform/data';
import { provisionStaffMember, generateTempPassword } from '@/lib/provisioning';
import {
  BOARD_OPTIONS,
  SCHOOL_TYPE_OPTIONS,
  INDIAN_STATES,
  DEFAULT_PLAN_TEMPLATES,
} from '@/features/platform/meta';
import {
  GRADE_LADDER,
  ONBOARDING_MODULE_KEYS,
  defaultModuleMap,
  currentAcademicYear,
  schoolSlug,
} from './schoolSchema';
import type { BoardType, SchoolSizeTier, SchoolType } from '@/types/models';

interface WizardState {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  board: string;
  type: string;
  sizeTier: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
  plan: string;
  billingCycle: string;
  startDate: string;
  academicYear: string;
  grades: string[];
  sections: string;
  modules: Record<string, boolean>;
}

const STEPS = [
  { id: 'basic', label: 'Basic details', icon: 'school' },
  { id: 'class', label: 'Classification', icon: 'award' },
  { id: 'admin', label: 'School admin', icon: 'user-plus' },
  { id: 'plan', label: 'Subscription', icon: 'credit-card' },
  { id: 'config', label: 'Configuration', icon: 'settings' },
  { id: 'modules', label: 'Modules', icon: 'box' },
  { id: 'review', label: 'Review & go live', icon: 'check-circle' },
] as const;

function initialState(): WizardState {
  return {
    name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', website: '',
    board: 'CBSE', type: 'day', sizeTier: 'medium',
    adminName: '', adminEmail: '', adminPhone: '', adminPassword: generateTempPassword(),
    plan: 'growth', billingCycle: 'annual', startDate: new Date().toISOString().slice(0, 10),
    academicYear: currentAcademicYear(), grades: ['LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'], sections: 'A, B, C',
    modules: defaultModuleMap(),
  };
}

/** Add-a-school onboarding wizard (spec §12.3) — dedicated multi-step flow. */
export function SchoolWizard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { uid, member } = useSession();
  const [step, setStep] = useState(0);
  const [st, setSt] = useState<WizardState>(initialState);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ schoolId: string; email: string; password: string } | null>(null);

  // Idempotency: compute the school id/slug ONCE and remember how far creation got,
  // so a retry after a post-create failure resumes instead of making a second school.
  const created = useRef<{ schoolId: string; schoolDone: boolean; flagsDone: boolean }>({
    schoolId: '',
    schoolDone: false,
    flagsDone: false,
  });

  const set = <K extends keyof WizardState>(k: K, v: WizardState[K]) => setSt((s) => ({ ...s, [k]: v }));

  const errors = useMemo(() => validateStep(step, st), [step, st]);
  const stepValid = Object.keys(errors).length === 0;

  const next = () => {
    setTouched(true);
    if (!stepValid) return;
    setTouched(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setTouched(false);
    setStep((s) => Math.max(s - 1, 0));
  };

  const finish = async () => {
    setBusy(true);
    // Compute the slug exactly once; reuse it across retries so a post-create
    // failure never spawns a second school with a fresh random id.
    if (!created.current.schoolId) created.current.schoolId = schoolSlug(st.name);
    const schoolId = created.current.schoolId;
    const actor = { uid: uid ?? 'unknown', name: member?.name };
    try {
      const planMeta = DEFAULT_PLAN_TEMPLATES.find((p) => p.id === st.plan);
      // Step 1 — create the school doc (skip if a prior attempt already did).
      if (!created.current.schoolDone) {
        await createSchool(
          schoolId,
          {
            name: st.name.trim(),
            board: st.board as BoardType,
            type: st.type as SchoolType,
            sizeTier: st.sizeTier as SchoolSizeTier,
            city: st.city || undefined,
            state: st.state || undefined,
            pincode: st.pincode || undefined,
            phone: st.phone || undefined,
            email: st.email || undefined,
            website: st.website || undefined,
            subscriptionStatus: 'trial',
            // Store the stable id (the canonical link) AND the display name.
            planId: planMeta?.id ?? st.plan,
            plan: planMeta?.name ?? st.plan,
            billingCycle: st.billingCycle as 'monthly' | 'annual',
            renewalDate: planEndDate(st.startDate, st.billingCycle),
            trialEndsAt: trialEnd(st.startDate, planMeta?.trialDays ?? 30),
            currentAcademicYear: st.academicYear,
            onboardingPct: 25,
            adminName: st.adminName.trim(),
            adminEmail: st.adminEmail.trim(),
            adminPhone: st.adminPhone || undefined,
            modulesEnabled: ONBOARDING_MODULE_KEYS.filter((k) => st.modules[k]),
          },
          actor,
        );
        created.current.schoolDone = true;
      }

      // Step 2 — per-school feature flag overrides (idempotent merge).
      if (!created.current.flagsDone) {
        await setDoc(schoolFlagsRef(schoolId), st.modules, { merge: true });
        created.current.flagsDone = true;
      }

      // Step 3 — provision the School Admin (Principal); secondary app, admin stays signed in.
      try {
        const res = await provisionStaffMember({
          schoolId,
          name: st.adminName.trim(),
          email: st.adminEmail.trim(),
          password: st.adminPassword,
          roleId: 'principal',
          phone: st.adminPhone || undefined,
          createdBy: actor.uid,
        });
        // Link the provisioned admin back onto the school record.
        await updateSchool(schoolId, { adminUid: res.uid }, actor);
        setDone({ schoolId, email: res.email, password: res.password });
        toast.success('School created', `${st.name} is live with its admin account.`);
      } catch (provErr) {
        // School exists; admin account couldn't be created (e.g. email in use, or
        // Email/Password auth not enabled yet). Surface clearly; admin can be added later.
        const msg = provErr instanceof Error && /email-already-in-use/.test(provErr.message)
          ? 'That admin email is already registered.'
          : 'Admin account could not be created (check that Email/Password auth is enabled). The school was still created.';
        toast.warning('School created — admin pending', msg);
        navigate(`/schools/${schoolId}`);
      }
    } catch {
      if (created.current.schoolDone) {
        // The school doc exists; a later step (flags) failed. Don't let the user
        // re-submit and create a duplicate — send them to the created school.
        toast.warning('School created — finish setup', 'The school was created but some setup steps need a retry. Continue from the school page.');
        navigate(`/schools/${schoolId}`);
      } else {
        toast.error('Could not create school', 'Please try again.');
        setBusy(false);
      }
    }
  };

  if (done) return <SuccessScreen schoolName={st.name} {...done} onView={() => navigate(`/schools/${done.schoolId}`)} onList={() => navigate('/schools')} />;

  return (
    <div className="nx-page">
      <div className="nx-formpage__head">
        <button type="button" className="nx-formpage__back" onClick={() => navigate('/schools')} aria-label="Cancel onboarding">
          <Icon name="chevron-left" size={18} />
        </button>
        <div className="nx-formpage__heading">
          <h1 className="nx-formpage__title">Add a school</h1>
          <p className="nx-formpage__sub">Onboard a new school onto the NEXLI platform.</p>
        </div>
      </div>

      <Stepper step={step} onJump={(i) => i < step && setStep(i)} />

      <Panel>
        <StepBody step={step} st={st} set={set} errors={touched ? errors : {}} />
      </Panel>

      <div className="nx-wizard__foot">
        <div>
          {step > 0 && (
            <Button variant="ghost" leftIcon="chevron-left" onClick={back} disabled={busy}>
              Back
            </Button>
          )}
        </div>
        <div className="nx-wizard__footright">
          <span className="nx-wizard__count">
            Step {step + 1} of {STEPS.length}
          </span>
          {step < STEPS.length - 1 ? (
            <Button variant="gold" rightIcon="arrow-right" onClick={next}>
              Continue
            </Button>
          ) : (
            <Button variant="gold" leftIcon="check" onClick={finish} loading={busy}>
              Create school
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Stepper ---------------- */
function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <div className="nx-stepper" role="list">
      {STEPS.map((s, i) => {
        const state = i < step ? 'done' : i === step ? 'active' : 'todo';
        return (
          <button
            key={s.id}
            type="button"
            role="listitem"
            className={cn('nx-stepper__item', `is-${state}`)}
            onClick={() => onJump(i)}
            disabled={i > step}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="nx-stepper__dot">{i < step ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}</span>
            <span className="nx-stepper__label">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Step bodies ---------------- */
type SetFn = <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;

function StepBody({ step, st, set, errors }: { step: number; st: WizardState; set: SetFn; errors: Record<string, string> }) {
  switch (STEPS[step].id) {
    case 'basic':
      return (
        <div className="nx-section__grid">
          <div className="nx-col-full">
            <Field label="School name" required error={errors.name}><Input value={st.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} placeholder="e.g. Sunrise International School" autoFocus /></Field>
          </div>
          <div className="nx-col-full">
            <Field label="Address"><Input value={st.address} onChange={(e) => set('address', e.target.value)} placeholder="Street address" /></Field>
          </div>
          <Field label="City"><Input value={st.city} onChange={(e) => set('city', e.target.value)} placeholder="City" /></Field>
          <Field label="State"><Select value={st.state} onChange={(e) => set('state', e.target.value)} placeholder="Select state" options={INDIAN_STATES.map((s) => ({ value: s, label: s }))} /></Field>
          <Field label="Pincode" error={errors.pincode}><Input value={st.pincode} onChange={(e) => set('pincode', e.target.value)} invalid={!!errors.pincode} inputMode="numeric" maxLength={6} placeholder="6-digit" /></Field>
          <Field label="Phone"><Input value={st.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Office number" /></Field>
          <Field label="Email" error={errors.email}><Input value={st.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} type="email" placeholder="office@school.edu" /></Field>
          <Field label="Website"><Input value={st.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></Field>
        </div>
      );
    case 'class':
      return (
        <div className="nx-section__grid">
          <Field label="Board" required><Select value={st.board} onChange={(e) => set('board', e.target.value)} options={BOARD_OPTIONS} /></Field>
          <Field label="School type" required><Select value={st.type} onChange={(e) => set('type', e.target.value)} options={SCHOOL_TYPE_OPTIONS} /></Field>
          <div className="nx-col-full">
            <Field label="Size tier" hint="Helps with default limits and recommendations.">
              <RadioGroup
                variant="inline"
                value={st.sizeTier}
                onChange={(v) => set('sizeTier', v)}
                options={[
                  { value: 'micro', label: 'Micro (<200)' },
                  { value: 'small', label: 'Small (200–600)' },
                  { value: 'medium', label: 'Medium (600–1500)' },
                  { value: 'large', label: 'Large (1500–4000)' },
                  { value: 'enterprise', label: 'Enterprise (4000+)' },
                ]}
              />
            </Field>
          </div>
        </div>
      );
    case 'admin':
      return (
        <>
          <p className="nx-wizard__hint">Create the School Admin (Principal) account. They receive these credentials to sign in and complete setup.</p>
          <div className="nx-section__grid">
            <Field label="Full name" required error={errors.adminName}><Input value={st.adminName} onChange={(e) => set('adminName', e.target.value)} invalid={!!errors.adminName} placeholder="Principal's name" /></Field>
            <Field label="Mobile"><Input value={st.adminPhone} onChange={(e) => set('adminPhone', e.target.value)} inputMode="numeric" placeholder="10-digit" /></Field>
            <div className="nx-col-full">
              <Field label="Email" required error={errors.adminEmail} hint="Used to sign in and for the welcome email."><Input value={st.adminEmail} onChange={(e) => set('adminEmail', e.target.value)} invalid={!!errors.adminEmail} type="email" placeholder="principal@school.edu" /></Field>
            </div>
            <div className="nx-col-full">
              <Field label="Temporary password" required error={errors.adminPassword} hint="Share securely. The admin can change it after first sign-in.">
                <Input
                  value={st.adminPassword}
                  onChange={(e) => set('adminPassword', e.target.value)}
                  invalid={!!errors.adminPassword}
                  type="password"
                  revealable
                  rightSlot={
                    <button type="button" className="nx-input__reveal" onClick={() => set('adminPassword', generateTempPassword())} aria-label="Generate new password" title="Generate">
                      <Icon name="refresh" size={15} />
                    </button>
                  }
                />
              </Field>
            </div>
          </div>
        </>
      );
    case 'plan':
      return (
        <>
          <Field label="Plan tier" required>
            <RadioGroup
              value={st.plan}
              onChange={(v) => set('plan', v)}
              options={DEFAULT_PLAN_TEMPLATES.map((p) => ({
                value: p.id,
                label: p.name,
                description: p.studentLimit ? `Up to ${p.studentLimit} students · ₹${p.priceMonthly}/mo` : 'Custom limits & pricing',
              }))}
            />
          </Field>
          <div className="nx-section__grid" style={{ marginTop: 16 }}>
            <Field label="Billing cycle"><RadioGroup variant="inline" value={st.billingCycle} onChange={(v) => set('billingCycle', v)} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} /></Field>
            <Field label="Start date"><DatePicker value={st.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
          </div>
        </>
      );
    case 'config':
      return (
        <>
          <div className="nx-section__grid">
            <Field label="Academic year"><Input value={st.academicYear} onChange={(e) => set('academicYear', e.target.value)} placeholder="2026-27" /></Field>
            <Field label="Section names" hint="Comma-separated."><Input value={st.sections} onChange={(e) => set('sections', e.target.value)} placeholder="A, B, C" /></Field>
          </div>
          <Field label="Grade structure" hint="Select the grades this school runs." error={errors.grades}>
            <div className="nx-chips">
              {GRADE_LADDER.map((g) => {
                const on = st.grades.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    className={cn('nx-chip', on && 'is-on')}
                    aria-pressed={on}
                    onClick={() => set('grades', on ? st.grades.filter((x) => x !== g) : [...st.grades, g])}
                  >
                    {on && <Icon name="check" size={12} strokeWidth={3} />}
                    {g}
                  </button>
                );
              })}
            </div>
          </Field>
        </>
      );
    case 'modules':
      return (
        <>
          <p className="nx-wizard__hint">Enable the modules this school's plan includes. These can be changed any time from Feature Flags.</p>
          <div className="nx-switchlist">
            {ONBOARDING_MODULE_KEYS.map((k) => {
              const meta = FEATURE_FLAGS.find((f) => f.key === k);
              return (
                <div className="nx-switchlist__row" key={k}>
                  <Toggle
                    checked={!!st.modules[k]}
                    onChange={(v) => set('modules', { ...st.modules, [k]: v })}
                    label={meta?.label ?? k}
                    description={meta?.description}
                  />
                </div>
              );
            })}
          </div>
        </>
      );
    case 'review':
      return <ReviewStep st={st} />;
    default:
      return null;
  }
}

function ReviewStep({ st }: { st: WizardState }) {
  const checklist = [
    'School profile created',
    'Admin account provisioned',
    'Modules configured',
    'Logo upload (school admin)',
    'Class & section setup',
    'Teacher accounts',
    'Student import',
  ];
  return (
    <div className="grid g-2">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ReviewBlock title="School">
          <KV k="Name" v={st.name} />
          <KV k="Board / type" v={`${st.board} · ${st.type}`} />
          <KV k="Location" v={[st.city, st.state].filter(Boolean).join(', ') || '—'} />
          <KV k="Academic year" v={st.academicYear} />
          <KV k="Grades" v={`${st.grades.length} selected`} />
        </ReviewBlock>
        <ReviewBlock title="Admin & plan">
          <KV k="Admin" v={`${st.adminName} (${st.adminEmail})`} />
          <KV k="Plan" v={`${st.plan} · ${st.billingCycle}`} />
          <KV k="Modules on" v={`${ONBOARDING_MODULE_KEYS.filter((k) => st.modules[k]).length} enabled`} />
        </ReviewBlock>
      </div>
      <ReviewBlock title="Go-live checklist">
        <div className="nx-checklist">
          {checklist.map((c, i) => (
            <div className="nx-checklist__item" key={c}>
              <span className={cn('nx-checklist__tick', i < 3 && 'is-done')}>
                <Icon name={i < 3 ? 'check' : 'clock'} size={12} strokeWidth={3} />
              </span>
              <span>{c}</span>
              {i >= 3 && <Badge variant="muted">School admin</Badge>}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, lineHeight: 1.55 }}>
          On creation the school goes live on a trial. The remaining items are completed by the School Admin from their
          onboarding checklist.
        </p>
      </ReviewBlock>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="nx-review">
      <div className="nx-review__title">{title}</div>
      {children}
    </div>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="nx-kv">
      <span className="nx-kv__k">{k}</span>
      <span className="nx-kv__v">{v}</span>
    </div>
  );
}

/* ---------------- Success ---------------- */
function SuccessScreen({
  schoolName,
  email,
  password,
  onView,
  onList,
}: {
  schoolName: string;
  email: string;
  password: string;
  onView: () => void;
  onList: () => void;
}) {
  const toast = useToast();
  const [revealed, setRevealed] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(`School: ${schoolName}\nEmail: ${email}\nTemp password: ${password}`);
    toast.success('Copied', 'Credentials copied to clipboard.');
  };
  return (
    <div className="nx-page">
      <div className="nx-wizard-success">
        <div className="nx-wizard-success__icon"><Icon name="check-circle" size={30} /></div>
        <h1 className="nx-status__title">{schoolName} is live</h1>
        <p className="nx-status__msg">The school and its admin account are ready. Share these credentials securely with the School Admin.</p>
        <div className="nx-creds">
          <div className="nx-kv"><span className="nx-kv__k">Sign-in email</span><span className="nx-kv__v">{email}</span></div>
          <div className="nx-kv">
            <span className="nx-kv__k">Temp password</span>
            <span className="nx-kv__v" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'monospace' }}>{revealed ? password : '•'.repeat(Math.max(8, password.length))}</span>
              <button
                type="button"
                className="nx-input__reveal"
                onClick={() => setRevealed((v) => !v)}
                aria-label={revealed ? 'Hide password' : 'Show password'}
                aria-pressed={revealed}
              >
                <Icon name={revealed ? 'eye-off' : 'eye'} size={16} />
              </button>
            </span>
          </div>
        </div>
        <p className="nx-status__msg" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--warning)', fontSize: 12.5, marginTop: 10 }}>
          <Icon name="alert-triangle" size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          One-time password — store it securely now. For safety the admin should change it on first sign-in; it won&rsquo;t be shown again.
        </p>
        <div className="nx-status__actions">
          <Button variant="gold" leftIcon="check-circle" onClick={onView}>Open school</Button>
          <Button variant="ghost" leftIcon="copy" onClick={copy}>Copy credentials</Button>
          <Button variant="subtle" onClick={onList}>All schools</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- validation ---------------- */
function validateStep(step: number, st: WizardState): Record<string, string> {
  const e: Record<string, string> = {};
  const id = STEPS[step].id;
  if (id === 'basic') {
    if (st.name.trim().length < 2) e.name = 'Enter the school name.';
    if (st.pincode && !/^\d{6}$/.test(st.pincode)) e.pincode = 'Pincode must be 6 digits.';
    if (st.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(st.email)) e.email = 'Enter a valid email.';
  }
  if (id === 'admin') {
    if (st.adminName.trim().length < 2) e.adminName = "Enter the admin's name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(st.adminEmail)) e.adminEmail = 'Enter a valid email.';
    if (st.adminPassword.length < 8) e.adminPassword = 'Password must be at least 8 characters.';
  }
  if (id === 'config') {
    if (st.grades.length === 0) e.grades = 'Select at least one grade.';
  }
  return e;
}

function planEndDate(start: string, cycle: string): number {
  const d = new Date(start || Date.now());
  d.setFullYear(d.getFullYear() + (cycle === 'annual' ? 1 : 0));
  if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
  return d.getTime();
}
function trialEnd(start: string, days: number): number {
  const d = new Date(start || Date.now());
  d.setDate(d.getDate() + days);
  return d.getTime();
}
