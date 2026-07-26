import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { Tabs } from '@/components/Tabs';
import { Field, Select } from '@/components/form';
import { Skeleton, EmptyState, InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/format';
import { useCan, useSession } from '@/app/providers/SessionProvider';
import { useDocument, memberRef } from '@/lib/db';
import { setMemberSecondaryRole } from '@/lib/provisioning';
import { useStaffMember } from '@/features/school/data';
import { StaffAttendancePanel, StaffPayrollPanel } from './StaffProfilePanels';
import { STAFF_STATUS_META } from '@/features/school/meta';
import { ROLES, type RoleId } from '@/types/roles';
import type { Member } from '@/types/models';
import type { StaffStatus } from '@/types/hr';
import '@/features/school/school.css';

export function StaffProfilePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { schoolId, isSuperAdmin } = useSession();
  const canWrite = useCan('hr.write');
  // User/role management is permission-based (`user.manage`) — assignable to Principal,
  // VP, HR, IT Admin and Senior Coordinators — not tied to a hardcoded role list.
  const canManageUsers = useCan('user.manage');
  // Payroll is sensitive — only finance/HR/leadership roles see the Payroll tab.
  const canPayroll = useCan('payroll.read');
  const { data: s, loading } = useStaffMember(schoolId, id);
  // Member doc (login account) carries the role + any secondary role; staff profile links via `uid`.
  const { data: memberDoc } = useDocument<Member>(schoolId && s?.uid ? memberRef(schoolId, s.uid) : null);
  const canAssignRoles = isSuperAdmin || canManageUsers;

  if (loading) return <div className="nx-page"><Skeleton width={52} height={52} radius={14} /><Panel><Skeleton height={220} /></Panel></div>;
  if (!s) return <div className="nx-page"><EmptyState icon="briefcase" title="Staff member not found" action={<Button variant="subtle" leftIcon="chevron-left" onClick={() => navigate('/hr')}>Back</Button>} /></div>;

  const statusMeta = STAFF_STATUS_META[(s.status as StaffStatus) ?? 'active'];
  const showAccess = canAssignRoles && !!s.uid;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'user' as const },
    { id: 'professional', label: 'Professional', icon: 'briefcase' as const },
    { id: 'attendance', label: 'Attendance', icon: 'clock' as const },
    ...(canPayroll ? [{ id: 'payroll', label: 'Payroll', icon: 'wallet' as const }] : []),
    { id: 'contact', label: 'Contact', icon: 'phone' as const },
    ...(showAccess ? [{ id: 'access', label: 'Access', icon: 'shield-check' as const }] : []),
  ];

  return (
    <div className="nx-page">
      <div className="nx-detail__head">
        <button type="button" className="nx-formpage__back" onClick={() => navigate('/hr')} aria-label="Back to HR"><Icon name="chevron-left" size={18} /></button>
        <Avatar name={s.name} src={s.photoUrl} size={52} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="nx-page__title" style={{ fontSize: 20 }}>{s.name}</h1>
          <div className="nx-detail__meta">
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            <span>{s.employeeId}</span>
            {s.designation && <><span className="dot" /><span>{s.designation}</span></>}
          </div>
        </div>
        {canWrite && <div className="nx-detail__actions"><Button variant="ghost" leftIcon="edit" onClick={() => navigate(`/hr/${id}/edit`)}>Edit</Button></div>}
      </div>

      <Tabs aria-label="Staff profile" tabs={tabs}>
        {(tab) =>
          tab === 'overview' ? (
            <div className="grid g-2">
              <Panel title="Employment">
                <KV k="Employee ID" v={s.employeeId} />
                <KV k="Designation" v={s.designation} />
                <KV k="Department" v={s.department} />
                <KV k="Type" v={s.employmentType?.replace(/_/g, ' ')} />
                <KV k="Joining date" v={s.joiningDate ? formatDate(s.joiningDate) : '—'} />
                <KV k="Status" v={statusMeta.label} />
              </Panel>
              <Panel title="Personal">
                <KV k="Gender" v={s.gender} />
                <KV k="Date of birth" v={s.dob ? formatDate(s.dob) : '—'} />
                <KV k="Blood group" v={s.bloodGroup} />
                <KV k="Marital status" v={s.maritalStatus} />
                <KV k="Experience" v={s.experienceYears != null ? `${s.experienceYears} yrs` : '—'} />
              </Panel>
            </div>
          ) : tab === 'professional' ? (
            <div className="grid g-2">
              <Panel title="Qualifications">
                {(s.qualifications ?? []).length === 0 ? <EmptyState icon="award" title="No qualifications on record" /> : (
                  (s.qualifications ?? []).map((q, i) => (
                    <div className="nx-kv" key={i}>
                      <span className="nx-kv__k">{q.degree}{q.specialization ? ` · ${q.specialization}` : ''}</span>
                      <span className="nx-kv__v">{[q.institution, q.year].filter(Boolean).join(', ') || '—'}</span>
                    </div>
                  ))
                )}
              </Panel>
              <Panel title="Statutory (masked)">
                <KV k="Aadhaar (last 4)" v={s.aadhaarLast4 ? `•••• ${s.aadhaarLast4}` : '—'} />
                <KV k="PAN" v={s.panMasked} />
                <KV k="UAN" v={s.uanNumber} />
                <KV k="Reporting to" v={s.reportingToName} />
              </Panel>
            </div>
          ) : tab === 'attendance' ? (
            <StaffAttendancePanel schoolId={schoolId!} uid={s.uid ?? ''} />
          ) : tab === 'payroll' ? (
            <StaffPayrollPanel />
          ) : tab === 'access' ? (
            <RoleAccessPanel schoolId={schoolId!} uid={s.uid!} member={memberDoc} />
          ) : (
            <div className="grid g-2">
              <Panel title="Contact">
                <KV k="Mobile" v={s.phone} />
                <KV k="Email" v={s.email} />
                <KV k="Address" v={s.address} />
                <KV k="City" v={s.city} />
                <KV k="State" v={s.state} />
                <KV k="Pincode" v={s.pincode} />
              </Panel>
              <Panel title="Emergency contact">
                <KV k="Name" v={s.emergencyContactName} />
                <KV k="Phone" v={s.emergencyContactPhone} />
              </Panel>
            </div>
          )
        }
      </Tabs>
    </div>
  );
}

/**
 * Leadership-only "Access" panel: assign or remove a SECONDARY role so one person
 * can hold two roles at once (multi-role staffing — e.g. Class Teacher + HOD,
 * VP + Teacher). Effective permissions become the union of both roles. Takes
 * effect on the member's next sign-in.
 */
function RoleAccessPanel({ schoolId, uid, member }: { schoolId: string; uid: string; member: Member | null }) {
  const toast = useToast();
  const primary = member?.roleId;
  const [sel, setSel] = useState<string>(member?.secondaryRoleId ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSel(member?.secondaryRoleId ?? ''); }, [member?.secondaryRoleId]);

  const options = useMemo(
    () =>
      Object.values(ROLES)
        .filter((r) => !['super_admin', 'parent', 'student'].includes(r.id) && r.id !== primary)
        .map((r) => ({ value: r.id, label: r.label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [primary],
  );

  const dirty = (member?.secondaryRoleId ?? '') !== sel;

  const save = async (next: string) => {
    setSaving(true);
    try {
      await setMemberSecondaryRole(schoolId, uid, (next || null) as RoleId | null);
      toast.success(
        next ? 'Secondary role assigned' : 'Secondary role removed',
        next ? 'Permissions are now the union of both roles (effective on next sign-in).' : 'Reverted to the primary role only.',
      );
    } catch {
      toast.error('Could not update role', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid g-2">
      <Panel title="Roles & access" sub="multi-role assignment (leadership only)">
        <div className="nx-kv">
          <span className="nx-kv__k">Primary role</span>
          <span className="nx-kv__v">{primary ? ROLES[primary]?.label ?? primary : '—'}</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Secondary role" hint="A second role held at the same time. Permissions become the union of both.">
            <Select
              placeholder="No secondary role"
              value={sel}
              onChange={(e) => setSel(e.target.value)}
              options={options}
            />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Button variant="gold" leftIcon="check" loading={saving} disabled={!dirty} onClick={() => save(sel)}>
            Save role
          </Button>
          {member?.secondaryRoleId && (
            <Button variant="ghost" leftIcon="x" disabled={saving} onClick={() => { setSel(''); void save(''); }}>
              Remove secondary role
            </Button>
          )}
        </div>
      </Panel>
      <InfoCard icon="info" title="How multi-role works">
        Indian schools routinely combine roles — a Subject Teacher who is also a Class Teacher, a VP who still teaches, a
        Librarian with class-teachership. Assigning a secondary role grants the <strong>union</strong> of both roles'
        permissions and ownership. Staff with the <strong>user-management</strong> permission (Principal, VP, HR, IT Admin,
        Senior Coordinators) can change this. The change applies the next time the member signs in.
      </InfoCard>
    </div>
  );
}

function KV({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <div className="nx-kv">
      <span className="nx-kv__k">{k}</span>
      <span className="nx-kv__v">{v != null && v !== '' ? v : '—'}</span>
    </div>
  );
}
