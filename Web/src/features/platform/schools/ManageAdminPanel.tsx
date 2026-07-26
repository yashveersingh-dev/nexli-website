import { useState } from 'react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Icon } from '@/components/Icon';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Field, Input } from '@/components/form';
import { InfoCard } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession } from '@/app/providers/SessionProvider';
import { provisionSchoolAdmin, saveSchoolAdminDetails, resetSchoolAdminPassword } from '@/features/platform/data';
import { generateTempPassword } from '@/lib/provisioning';
import type { School } from '@/types/models';

/**
 * School administrator lifecycle (platform-side): provision the login when it was
 * skipped at onboarding, reset the admin's password, edit the contact details, or
 * replace the primary admin. Closes the audit gap where admin management was
 * read-only and `adminUid` was never written back.
 */
export function ManageAdminPanel({ school }: { school: School }) {
  const toast = useToast();
  const { uid, member } = useSession();
  const actor = { uid: uid ?? 'unknown', name: member?.name };
  const hasLogin = !!school.adminUid;

  const [mode, setMode] = useState<null | 'provision' | 'edit'>(null);
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const openProvision = () => {
    setName(school.adminName ?? ''); setEmail(hasLogin ? '' : school.adminEmail ?? ''); setPhone(school.adminPhone ?? '');
    setPassword(generateTempPassword()); setMode('provision');
  };
  const openEdit = () => {
    setName(school.adminName ?? ''); setEmail(school.adminEmail ?? ''); setPhone(school.adminPhone ?? ''); setMode('edit');
  };

  const submit = async () => {
    if (!name.trim() || !email.trim()) return;
    if (mode === 'provision' && password.length < 8) return;
    setBusy(true);
    try {
      if (mode === 'provision') {
        const res = await provisionSchoolAdmin(school, { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, password }, actor);
        toast.success('Admin login provisioned', `${res.email} · share the temporary password`);
      } else {
        await saveSchoolAdminDetails(school, { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined }, actor);
        toast.success('Admin details updated');
      }
      setMode(null);
    } catch (e) {
      const msg = e instanceof Error && /email-already-in-use/.test(e.message)
        ? 'That email is already registered.'
        : 'Could not complete — check that Email/Password auth is enabled.';
      toast.error('Action failed', msg);
    } finally { setBusy(false); }
  };

  const doReset = async () => {
    setBusy(true);
    try { await resetSchoolAdminPassword(school, actor); toast.success('Reset email sent', school.adminEmail ?? undefined); setReset(false); }
    catch { toast.error('Could not send reset', 'Ensure an admin email is on file.'); } finally { setBusy(false); }
  };

  return (
    <Panel title="School admin" headerRight={hasLogin ? <Badge variant="success">Login active</Badge> : <Badge variant="warning">No login</Badge>}>
      <div className="nx-kv"><span className="nx-kv__k">Name</span><span className="nx-kv__v">{school.adminName ?? '—'}</span></div>
      <div className="nx-kv"><span className="nx-kv__k">Email</span><span className="nx-kv__v">{school.adminEmail ?? '—'}</span></div>
      <div className="nx-kv"><span className="nx-kv__k">Mobile</span><span className="nx-kv__v">{school.adminPhone ?? '—'}</span></div>

      {!hasLogin && (
        <InfoCard icon="alert-triangle" title="Login not provisioned">
          {school.adminName ? 'Contact details are on file but no sign-in account was created.' : 'No administrator has been set up for this school yet.'} Provision a login so the admin can access NEXLI.
        </InfoCard>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {hasLogin ? (
          <>
            <Button variant="subtle" size="sm" leftIcon="refresh" onClick={() => setReset(true)} disabled={!school.adminEmail}>Reset password</Button>
            <Button variant="ghost" size="sm" leftIcon="edit" onClick={openEdit}>Edit details</Button>
            <Button variant="ghost" size="sm" leftIcon="user-plus" onClick={openProvision}>Replace admin</Button>
          </>
        ) : (
          <Button variant="gold" size="sm" leftIcon="user-plus" onClick={openProvision}>Provision login</Button>
        )}
      </div>

      <Modal
        open={mode !== null}
        onClose={() => (busy ? undefined : setMode(null))}
        icon="user-plus"
        tone="gold"
        title={mode === 'edit' ? 'Edit admin details' : hasLogin ? 'Replace school admin' : 'Provision school admin'}
        size="md"
        dismissible={!busy}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMode(null)} disabled={busy}>Cancel</Button>
            <Button variant="gold" leftIcon="check" loading={busy} disabled={!name.trim() || !email.trim()} onClick={submit}>
              {mode === 'edit' ? 'Save' : 'Create login'}
            </Button>
          </>
        }
      >
        <Field label="Full name" required><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
        <div className="grid g-2">
          <Field label="Email" required hint={mode === 'edit' ? 'Changing this updates the record only, not the login.' : undefined}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="principal@school.edu" />
          </Field>
          <Field label="Mobile" optional><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" /></Field>
        </div>
        {mode === 'provision' && (
          <Field label="Temporary password" hint="Share securely; the admin can reset it after first sign-in.">
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} style={{ fontFamily: 'var(--mono, monospace)' }} />
              <Button variant="ghost" size="sm" leftIcon="refresh" onClick={() => setPassword(generateTempPassword())} aria-label="Regenerate password" />
            </div>
          </Field>
        )}
        {mode === 'provision' && hasLogin && (
          <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 10, lineHeight: 1.5, display: 'flex', gap: 6 }}>
            <Icon name="alert-triangle" size={14} /> This creates a new login and makes it the primary admin. The previous admin account is not deleted.
          </p>
        )}
      </Modal>

      <ConfirmModal
        open={reset} onClose={() => setReset(false)} onConfirm={doReset} tone="gold" loading={busy}
        title="Send password reset?" message={`A reset link will be emailed to ${school.adminEmail ?? 'the admin'}.`} confirmLabel="Send reset link"
      />
    </Panel>
  );
}
