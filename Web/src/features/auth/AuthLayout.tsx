import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import './auth.css';

function NexliMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
      <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
      <path d="M3 7 L12 12 L21 7" />
      <path d="M12 12 L12 22" />
    </svg>
  );
}

const BRAND_POINTS: { icon: IconName; label: string }[] = [
  { icon: 'shield-check', label: 'Multi-tenant, DPDP-aligned, audit-logged by design' },
  { icon: 'activity', label: 'Attendance, fees, exams & 40+ modules in one system' },
  { icon: 'wifi', label: 'Offline-first — works on 2G and 5-year-old Android' },
];

/**
 * Shared shell for the auth screens: a premium obsidian/gold brand panel on
 * desktop, a compact branded header on mobile, and a centered form column.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="nx-auth">
      <aside className="nx-auth__brand">
        <div className="nx-auth__brandtop">
          <div className="nx-auth__logo">
            <NexliMark />
          </div>
          <div className="nx-auth__wordmark">
            <div className="b">NEXLI</div>
            <div className="s">SCHOOL OPERATING SYSTEM</div>
          </div>
        </div>

        <div className="nx-auth__brandmid">
          <h1 className="nx-auth__headline">
            One system to run the <span className="g">entire school.</span>
          </h1>
          <p className="nx-auth__sub">
            From admissions to attendance, fees to fleet — NEXLI brings every operation into a single,
            beautifully fast platform built for Indian K-12 schools.
          </p>
          <div className="nx-auth__points">
            {BRAND_POINTS.map((p) => (
              <div key={p.label} className="nx-auth__point">
                <span className="i">
                  <Icon name={p.icon} size={15} />
                </span>
                {p.label}
              </div>
            ))}
          </div>
        </div>

        <div className="nx-auth__brandfoot">
          <Icon name="lock" size={13} />
          Bank-grade security · India data residency · © 2026 NEXLI
        </div>
      </aside>

      <main className="nx-auth__panel">
        <div className="nx-auth__mbrand">
          <div className="nx-auth__mlogo">
            <NexliMark />
          </div>
          <div className="nx-auth__mname">NEXLI</div>
        </div>

        <div className="nx-auth__formwrap">
          <div className="nx-auth__card">{children}</div>
        </div>

        <div className="nx-auth__panelfoot">Protected by NEXLI · Need help? Contact your school administrator.</div>
      </main>
    </div>
  );
}

/** Inline alert used by the auth forms (error by default, success variant). */
export function AuthAlert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) {
  return (
    <div className={tone === 'success' ? 'nx-auth__alert is-success' : 'nx-auth__alert'} role="alert">
      <Icon name={tone === 'success' ? 'check-circle' : 'alert-triangle'} size={15} />
      <span>{children}</span>
    </div>
  );
}
