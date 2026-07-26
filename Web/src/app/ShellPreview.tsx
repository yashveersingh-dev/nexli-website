import { AppShell } from '@/app/shell';
import { navForAudience, bottomNavForAudience, filterNav } from '@/app/nav';
import {
  KPICard,
  Panel,
  Badge,
  Avatar,
  Icon,
  Donut,
  DonutLegend,
  LineChart,
} from '@/components';

/**
 * P0 shell preview — mounts the AppShell with a principal-style dashboard so the
 * navigation + mobile behavior can be validated at every breakpoint. Replaced by
 * real role dashboards (P4) and a session-driven shell container (P1/P2).
 */
export function ShellPreview() {
  const nav = filterNav(navForAudience('staff'), {
    isSuperAdmin: false,
    can: () => true,
    hasFlag: () => true,
  });
  const bottomNav = bottomNavForAudience('staff');

  const contextChip = (
    <div className="sb-school">
      <div className="sb-school__wrap">
        <div className="sb-school__name">
          Sunrise International School
          <Icon name="chevron-down" size={12} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div className="sb-school__meta">
          2025-26 <span className="dot" /> Term 1
        </div>
      </div>
    </div>
  );

  const appbarActions = (
    <>
      <button type="button" className="nx-appbar__btn" aria-label="Notifications">
        <Icon name="bell" size={19} />
        <span className="nx-appbar__badge">12</span>
      </button>
      <Avatar name="Arjun Mehta" size={32} gradient="linear-gradient(135deg,#7a8a9e,#445566)" />
    </>
  );

  return (
    <AppShell
      nav={nav}
      bottomNav={bottomNav}
      contextChip={contextChip}
      appbarTitle="Dashboard"
      appbarActions={appbarActions}
      quickActions={[
        { label: 'Add Announcement', icon: 'megaphone' },
        { label: 'Issue Circular', icon: 'file-text' },
        { label: 'Create Fee Invoice', icon: 'credit-card' },
        { label: 'New Admission', icon: 'user-plus' },
      ]}
    >
      {/* Desktop greeting / actions (mobile uses the app bar) */}
      <div className="topbar">
        <div className="greeting">
          <h1>
            Good morning, <span className="name">Principal Arjun Mehta</span> <span className="spark">✨</span>
          </h1>
          <p>
            “Education is the most powerful weapon which you can use to change the world.” — Nelson
            Mandela
          </p>
        </div>
        <div className="tb-actions hidden md:flex">
          <div className="tb-search">
            <Icon name="search" size={14} style={{ color: 'var(--text-muted)' }} />
            <input placeholder="Search students, teachers..." />
            <span className="kbd">⌘K</span>
          </div>
          <button type="button" className="tb-icon-btn" aria-label="Notifications">
            <Icon name="bell" size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="badge">12</span>
          </button>
          <div className="tb-pill">
            <Avatar name="Arjun Mehta" size={30} gradient="linear-gradient(135deg,#7a8a9e,#445566)" />
            <div className="tb-pill__meta">
              <div className="n">Principal Arjun Mehta</div>
              <div className="r">Principal</div>
            </div>
            <Icon name="chevron-down" size={14} className="chev" />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid kpi-grid--5">
        <KPICard icon="users" label="Total Students" count={1248} format="us" delta={{ value: '+3.2% this term', dir: 'up' }} />
        <KPICard icon="briefcase" label="Total Staff" count={156} format="us" delta={{ value: '+1.3% this term', dir: 'up' }} />
        <KPICard icon="clock" label="Attendance Today" count={94.6} format="percent" decimals={1} suffix="%" delta={{ value: '+2.8% vs yesterday', dir: 'up' }} />
        <KPICard icon="credit-card" label="Fee Collection" count={4875320} format="inrCompact" delta={{ value: '+12.4% this month', dir: 'up' }} />
        <KPICard icon="alert-triangle" label="Pending Fee" count={1245670} format="inrCompact" sub="63 students pending" subColor="var(--warning)" />
      </div>

      {/* Row of panels */}
      <div className="grid g-3">
        <Panel title="Attendance Overview" headerRight={<Badge variant="success">Today</Badge>} footer={{ label: 'View Attendance Report' }}>
          <div className="donut-wrap">
            <Donut
              segments={[
                { value: 1182, color: '#22C55E' },
                { value: 52, color: '#EF4444' },
                { value: 14, color: '#F59E0B' },
              ]}
              centerValue="94.6%"
              centerLabel="Present"
            />
            <DonutLegend
              items={[
                { label: 'Present', value: '1,182', color: '#22C55E' },
                { label: 'Absent', value: '52', color: '#EF4444' },
                { label: 'On Leave', value: '14', color: '#F59E0B' },
              ]}
            />
          </div>
        </Panel>

        <Panel title="Fee Collection Trend" sub="(this month)" footer={{ label: 'View Detailed Report' }}>
          <div className="line-chart__head">
            <div>
              <div className="line-chart__value">₹48,75,320</div>
              <div className="line-chart__sub">Collected this month</div>
            </div>
            <div className="line-chart__delta">
              <div className="v">↑ 12.4%</div>
              <div className="l">vs last month</div>
            </div>
          </div>
          <LineChart
            points={[10, 14, 17, 20, 24, 28, 30, 33, 36, 38, 40, 42, 44, 46, 47, 48, 48.5, 48.8]}
            yLabels={['60L', '40L', '20L', '0']}
            xLabels={['1 Jun', '10 Jun', '20 Jun', '30 Jun']}
          />
        </Panel>

        <Panel title="Important Alerts" headerRight={<Badge variant="danger">3 high</Badge>} footer={{ label: 'View All' }}>
          <AlertRow icon="alert-triangle" tone="danger" title="Fee Payment Overdue" sub="63 students have overdue fees" tag="High" />
          <AlertRow icon="shield-check" tone="warning" title="CBSE Affiliation Document" sub="Renewal due in 30 days" tag="Medium" />
          <AlertRow icon="heart-pulse" tone="warning" title="Medical Checkup Due" sub="Grade 3–5 annual medical pending" tag="Medium" />
        </Panel>
      </div>
    </AppShell>
  );
}

function AlertRow({
  icon,
  tone,
  title,
  sub,
  tag,
}: {
  icon: 'alert-triangle' | 'shield-check' | 'heart-pulse';
  tone: 'danger' | 'warning' | 'info';
  title: string;
  sub: string;
  tag: string;
}) {
  return (
    <div className="alert-row">
      <div className={`alert-row__icon ${tone}`}>
        <Icon name={icon} size={16} />
      </div>
      <div className="alert-row__body">
        <div className="alert-row__title">{title}</div>
        <div className="alert-row__sub">{sub}</div>
      </div>
      <span className={`alert-row__tag ${tone === 'danger' ? 'high' : 'medium'}`}>{tag}</span>
    </div>
  );
}
