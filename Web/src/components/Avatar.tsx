import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

export interface AvatarProps {
  name: string;
  /** ImageKit URL (or any image URL). When absent, renders initials-on-gradient. */
  src?: string | null;
  size?: number;
  /** CSS gradient override for the initials background. */
  gradient?: string;
  className?: string;
}

/**
 * Profile avatar. Shows the uploaded photo (ImageKit URL) when present, else a
 * reference-accurate initials-on-gradient fallback. This is the default until
 * ImageKit credentials are configured.
 */
export function Avatar({ name, src, size = 38, gradient, className }: AvatarProps) {
  return (
    <div
      className={cn('nx-avatar', className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        background: src ? '#1a1a1a' : (gradient ?? 'linear-gradient(135deg, var(--gold), var(--gold-deep))'),
      }}
      title={name}
    >
      {src ? <img src={src} alt={name} loading="lazy" /> : <span>{initials(name)}</span>}
    </div>
  );
}
