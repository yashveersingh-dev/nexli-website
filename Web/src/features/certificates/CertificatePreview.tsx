import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { certBodyHtml, certStyle, safeAccent, type CertOpts } from './print';

/**
 * Live, display-only certificate preview rendered inline (no popup). Mirrors the
 * structure and visual tokens of `buildCertificateHtml`: the chrome (school name,
 * logo, title, serial, signature) is real JSX; the per-type body prose reuses the
 * shared `certBodyHtml` so the preview never drifts from the printed document.
 *
 * The certificate is laid out at its true A4 pixel width and scaled down with a
 * CSS transform so it fits whatever width the preview panel happens to be.
 */
export function CertificatePreview({ opts }: { opts: CertOpts }) {
  // `certStyle` already returns a validated accent; re-assert here (defense in
  // depth) since it is interpolated into inline `style` strings below — only a
  // strict #RRGGBB value is ever allowed (XSS-safe), else the safe gold default.
  const { fontFamily, title, landscape, pageWidth } = certStyle(opts);
  const accent = safeAccent(opts.accentColor);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState(0);

  // Recompute scale (and the collapsed wrapper height) whenever the panel
  // resizes or the rendered certificate height changes.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const sheet = sheetRef.current;
    if (!wrap || !sheet) return;
    const measure = () => {
      const s = Math.min(1, wrap.clientWidth / pageWidth);
      setScale(s);
      setScaledHeight(sheet.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, [pageWidth]);

  const sheetStyle: CSSProperties = {
    width: pageWidth,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    background: '#fff',
    color: '#14110c',
    fontFamily,
    boxSizing: 'border-box',
    padding: landscape ? '40px 56px' : '48px 56px',
    border: `2px solid ${accent}`,
  };

  const logo = opts.logoUrl?.trim();

  return (
    <div ref={wrapRef} style={{ width: '100%', height: scaledHeight || undefined, overflow: 'hidden' }}>
      <div ref={sheetRef} style={sheetStyle} aria-hidden="true">
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '1px solid #ddd', paddingBottom: 16, marginBottom: 24 }}>
          {logo ? (
            <img
              src={logo}
              alt=""
              referrerPolicy="no-referrer"
              style={{ display: 'block', maxHeight: 72, maxWidth: 220, margin: '0 auto 12px', objectFit: 'contain' }}
            />
          ) : null}
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '.5px', color: '#1a1206' }}>
            {opts.schoolName}
          </div>
          {opts.schoolLocation ? (
            <div style={{ fontSize: 13, color: '#6b6354', marginTop: 4 }}>{opts.schoolLocation}</div>
          ) : null}
          <div style={{ fontSize: 12, color: '#6b6354', marginTop: 10 }}>
            Serial No: {opts.serialNo} &nbsp;•&nbsp; Date: {opts.issuedDateText}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: '3px',
            color: accent,
            margin: '8px 0 26px',
            textDecoration: 'underline',
          }}
        >
          {title}
        </div>

        {/* Body — reuses the exact print prose for this certificate type. */}
        <div className="nx-cert-preview-body" style={{ fontSize: 15.5, lineHeight: 2, textAlign: 'justify', minHeight: 220 }}>
          <style>{`
            .nx-cert-preview-body p { margin: 0 0 14px; }
            .nx-cert-preview-body .cert-table { width: 100%; border-collapse: collapse; margin: 12px 0 18px; }
            .nx-cert-preview-body .cert-table td { padding: 6px 10px; border: 1px solid #ddd; font-size: 14px; }
            .nx-cert-preview-body .cert-table td:first-child { width: 42%; color: #6b6354; }
          `}</style>
          <div dangerouslySetInnerHTML={{ __html: certBodyHtml(opts) }} />
        </div>

        {/* Footer / signature */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 48, fontSize: 13.5 }}>
          <div>Place: {opts.schoolLocation || '____________'}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #333', paddingTop: 6, minWidth: 180 }}>
              Principal / Authorised Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
