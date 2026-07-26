import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Panel } from '@/components/Panel';
import { DataTable, type Column } from '@/components/DataTable';
import { Input } from '@/components/form';
import { InfoCard } from '@/components/feedback';
import { useSession } from '@/app/providers/SessionProvider';
import { useSchools } from '@/features/platform/data';
import type { School } from '@/types/models';

interface AdminRow {
  schoolId: string;
  schoolName: string;
  logoUrl?: string;
  adminName: string;
  adminEmail: string;
  adminPhone?: string;
  status: string;
}

/**
 * Platform Users & Roles. The Super Admin operates at the platform layer; this
 * shows the current operator and a cross-school **admin directory** (school
 * configuration data — never student/staff PII). Additional platform operators
 * are provisioned by the Firebase project owner (the `super_admin` claim is
 * owner-assigned), per spec §14.
 */
export function UsersPage() {
  const navigate = useNavigate();
  const { member, firebaseUser } = useSession();
  const { data: schools, loading, error } = useSchools();
  const [search, setSearch] = useState('');

  const admins: AdminRow[] = useMemo(
    () =>
      schools
        .filter((s) => s.adminName || s.adminEmail)
        .map((s: School) => ({
          schoolId: s.id,
          schoolName: s.name,
          logoUrl: s.logoUrl,
          adminName: s.adminName ?? '—',
          adminEmail: s.adminEmail ?? '—',
          adminPhone: s.adminPhone,
          status: s.subscriptionStatus ?? 'trial',
        }))
        .filter((r) => {
          const q = search.trim().toLowerCase();
          return !q || r.adminName.toLowerCase().includes(q) || r.adminEmail.toLowerCase().includes(q) || r.schoolName.toLowerCase().includes(q);
        }),
    [schools, search],
  );

  const columns: Column<AdminRow>[] = [
    {
      key: 'admin',
      header: 'Administrator',
      primary: true,
      render: (r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar name={r.adminName} size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.adminName}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.adminEmail}</div>
          </div>
        </div>
      ),
    },
    { key: 'school', header: 'School', render: (r) => r.schoolName },
    { key: 'role', header: 'Role', render: () => <Badge variant="info">Principal</Badge> },
    { key: 'phone', header: 'Mobile', hideOnMobile: true, render: (r) => r.adminPhone ?? '—' },
  ];

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Users &amp; Roles</h1>
          <p className="nx-page__sub">Platform operators and the school administrator directory.</p>
        </div>
      </div>

      <Panel title="Platform operator">
        <div className="nx-account__head" style={{ borderBottom: 0, marginBottom: 0, paddingBottom: 0 }}>
          <Avatar name={member?.name ?? 'Super Admin'} size={48} />
          <div>
            <div className="nx-account__name">{member?.name ?? 'Super Admin'}</div>
            <div className="nx-account__role">Super Admin · {firebaseUser?.email ?? 'Platform owner'}</div>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </Panel>

      <InfoCard icon="shield-check" title="Adding platform operators">
        The <strong>super_admin</strong> role is assigned by the Firebase project owner (via the bootstrap script or
        custom claims) and cannot be granted from the app — by design. School-level roles are managed within each
        school by its administrators.
      </InfoCard>

      <Panel title="School administrators" sub={loading ? '' : `${admins.length}`}>
        <DataTable
          columns={columns}
          rows={admins}
          rowKey={(r) => r.schoolId}
          loading={loading}
          error={error ? 'Could not load administrators.' : null}
          onRowClick={(r) => navigate(`/schools/${r.schoolId}`)}
          emptyIcon="users"
          emptyTitle="No school administrators yet"
          emptyMessage="Administrators appear here as you onboard schools."
          toolbar={
            <div className="nx-toolbar">
              <div className="nx-toolbar__search">
                <Input leftIcon="search" placeholder="Search administrators or schools…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search administrators" />
              </div>
            </div>
          }
        />
      </Panel>
    </div>
  );
}
