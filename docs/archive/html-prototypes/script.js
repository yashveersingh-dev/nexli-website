/* =============================================================
   NEXLI School ERP — Shared interactions
   ============================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initCounters();
  initDonuts();
  initLineCharts();
});

/* ---------- Mobile sidebar ---------- */
function initSidebar() {
  const toggle = document.querySelector('.mobile-toggle');
  const overlay = document.querySelector('.sidebar-overlay');
  const sidebar = document.querySelector('.sidebar');
  if (!toggle || !sidebar) return;

  const close = () => {
    sidebar.classList.remove('open');
    overlay && overlay.classList.remove('open');
  };
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay && overlay.classList.toggle('open');
  });
  overlay && overlay.addEventListener('click', close);
  // Close after a nav click on mobile
  sidebar.querySelectorAll('.sb-nav__item').forEach(el => {
    el.addEventListener('click', () => {
      if (window.innerWidth <= 900) close();
    });
  });
}

/* ---------- Animated counters ---------- */
function initCounters() {
  const items = document.querySelectorAll('[data-counter]');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  items.forEach(el => observer.observe(el));
}

function animateCounter(el) {
  const raw = el.getAttribute('data-counter');
  const prefix = el.getAttribute('data-prefix') || '';
  const suffix = el.getAttribute('data-suffix') || '';
  const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
  const useCommas = el.getAttribute('data-format') === 'in';   // Indian numbering 1,28,347
  const useCommasUS = el.getAttribute('data-format') === 'us'; // standard 128,347
  const target = parseFloat(raw);
  if (isNaN(target)) { el.textContent = prefix + raw + suffix; return; }
  const duration = 1200;
  const start = performance.now();
  const startVal = 0;

  function step(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const val = startVal + (target - startVal) * eased;
    el.textContent = prefix + formatNumber(val, decimals, useCommas, useCommasUS) + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function formatNumber(val, decimals, useIndian, useUS) {
  if (decimals > 0) val = val.toFixed(decimals); else val = Math.round(val).toString();
  if (useIndian) return formatIndian(val);
  if (useUS) return Number(val).toLocaleString('en-US');
  return val;
}

function formatIndian(numStr) {
  const [intPart, decPart] = numStr.split('.');
  // Indian numbering: last 3 digits, then groups of 2
  let n = intPart;
  if (n.length <= 3) return decPart ? `${n}.${decPart}` : n;
  const last3 = n.slice(-3);
  const rest = n.slice(0, -3);
  const grouped = rest.replace(/(\d)(?=(\d{2})+$)/g, '$1,');
  const out = `${grouped},${last3}`;
  return decPart ? `${out}.${decPart}` : out;
}

/* ---------- Donut charts ---------- */
function initDonuts() {
  document.querySelectorAll('.donut[data-segments]').forEach(donut => {
    const segments = JSON.parse(donut.getAttribute('data-segments'));
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const radius = 70;
    const stroke = 22;
    const circumference = 2 * Math.PI * radius;
    const cx = 85, cy = 85;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 170 170');
    // Background track
    const bg = document.createElementNS(svgNS, 'circle');
    bg.setAttribute('cx', cx);
    bg.setAttribute('cy', cy);
    bg.setAttribute('r', radius);
    bg.setAttribute('stroke', 'rgba(255,255,255,0.04)');
    bg.setAttribute('stroke-width', stroke);
    bg.setAttribute('fill', 'none');
    svg.appendChild(bg);

    let offset = 0;
    segments.forEach((seg, i) => {
      const len = (seg.value / total) * circumference;
      const c = document.createElementNS(svgNS, 'circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', radius);
      c.setAttribute('stroke', seg.color);
      c.setAttribute('stroke-width', stroke);
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke-dasharray', `0 ${circumference}`);
      c.setAttribute('stroke-dashoffset', -offset);
      c.setAttribute('stroke-linecap', 'butt');
      c.style.transition = 'stroke-dasharray 1.1s cubic-bezier(0.22, 1, 0.36, 1)';
      c.style.transitionDelay = `${i * 0.12}s`;
      svg.appendChild(c);
      // Trigger animation
      requestAnimationFrame(() => {
        setTimeout(() => {
          c.setAttribute('stroke-dasharray', `${len} ${circumference}`);
        }, 30);
      });
      offset += len;
    });
    donut.innerHTML = '';
    donut.appendChild(svg);
    // Keep center text node if defined as data-center
    const centerVal = donut.getAttribute('data-center-value');
    const centerLabel = donut.getAttribute('data-center-label');
    if (centerVal) {
      const center = document.createElement('div');
      center.className = 'donut__center';
      center.innerHTML = `<div class="v">${centerVal}</div><div class="l">${centerLabel || ''}</div>`;
      donut.appendChild(center);
    }
  });

  /* Ring (small attendance ring) */
  document.querySelectorAll('.ring').forEach(ring => {
    const pct = parseFloat(ring.getAttribute('data-pct')) || 0;
    const color = ring.getAttribute('data-color') || 'var(--success)';
    const stroke = parseFloat(ring.getAttribute('data-stroke') || '5');
    const size = ring.clientWidth || 50;
    const radius = (size - stroke) / 2;
    const c = 2 * Math.PI * radius;
    const offset = c * (1 - pct / 100);
    ring.innerHTML = `
      <svg viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="rgba(255,255,255,0.06)" stroke-width="${stroke}" fill="none"/>
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${color}" stroke-width="${stroke}" fill="none"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}" class="ring__bar"
          style="transition: stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1);"/>
      </svg>`;
    requestAnimationFrame(() => {
      setTimeout(() => {
        ring.querySelector('.ring__bar').setAttribute('stroke-dashoffset', offset);
      }, 60);
    });
  });
}

/* ---------- Line charts ---------- */
function initLineCharts() {
  document.querySelectorAll('.line-chart[data-points]').forEach(chart => {
    const points = JSON.parse(chart.getAttribute('data-points'));
    const max = Math.max(...points);
    const min = 0;
    const plot = chart.querySelector('.plot');
    if (!plot) return;
    const w = 600, h = 200;
    const stepX = w / (points.length - 1);

    const coords = points.map((p, i) => ({
      x: i * stepX,
      y: h - ((p - min) / (max - min)) * (h - 10) - 5
    }));

    // Smooth path
    const pathD = smoothPath(coords);
    const areaD = pathD + ` L ${coords[coords.length - 1].x} ${h} L 0 ${h} Z`;

    const gradId = `g${Math.random().toString(36).slice(2,8)}`;
    plot.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#C6A55C" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#C6A55C" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#${gradId})" class="line-chart__area"/>
        <path d="${pathD}" fill="none" stroke="#C6A55C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="line-chart__line"/>
        ${coords.map((c, i) => `<circle cx="${c.x}" cy="${c.y}" r="3" fill="#C6A55C" opacity="${i === coords.length - 1 ? 1 : 0}"/>`).join('')}
      </svg>`;

    // Animate the line drawing
    const linePath = plot.querySelector('.line-chart__line');
    const area = plot.querySelector('.line-chart__area');
    if (linePath) {
      const len = linePath.getTotalLength();
      linePath.style.strokeDasharray = len;
      linePath.style.strokeDashoffset = len;
      linePath.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1)';
      area.style.opacity = '0';
      area.style.transition = 'opacity 1.6s ease';
      requestAnimationFrame(() => {
        setTimeout(() => {
          linePath.style.strokeDashoffset = '0';
          area.style.opacity = '1';
        }, 200);
      });
    }
  });
}

function smoothPath(coords) {
  if (!coords.length) return '';
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const p0 = coords[i - 1];
    const p1 = coords[i];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}
