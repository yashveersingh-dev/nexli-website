import { z } from 'zod';

/** String-based (input === output) so it satisfies the kit `Form<T>`. */
export const visitorSchema = z.object({
  name: z.string().trim().min(2, 'Visitor name required'),
  phone: z.string().trim().refine((v) => v === '' || /^\d{10}$/.test(v), 'Enter a 10-digit mobile'),
  purpose: z.enum(['parent_meeting', 'admission', 'vendor', 'interview', 'official', 'maintenance', 'delivery', 'other']),
  whomToMeet: z.string().trim().optional(),
  company: z.string().trim().optional(),
  partySize: z.string().refine((v) => v === '' || (Number(v) >= 1 && Number(v) <= 99), 'Party size 1–99'),
  idType: z.enum(['aadhaar', 'pan', 'driving_license', 'voter_id', 'other']).optional(),
  idLast4: z.string().trim().refine((v) => v === '' || /^\d{4}$/.test(v), 'Last 4 digits only'),
  vehicleNo: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type VisitorValues = z.infer<typeof visitorSchema>;

export const emptyVisitor: VisitorValues = {
  name: '', phone: '', purpose: 'parent_meeting', whomToMeet: '', company: '',
  partySize: '1', idType: undefined, idLast4: '', vehicleNo: '', notes: '',
};

const pad = (n: number, w: number) => String(n).padStart(w, '0');

/**
 * Cryptographically-strong integer in [0, max) using the Web Crypto API, with a
 * graceful fallback to Math.random only where crypto is unavailable (it isn't, in
 * any modern browser or worker). Used for the gate OTP and the pass-number tail so
 * neither is a predictable function of the wall clock (a `Math.random()` OTP and a
 * `seconds`-derived pass are both guessable).
 */
function secureInt(max: number): number {
  const g: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (g?.getRandomValues) {
    // Rejection-sample to avoid modulo bias.
    const limit = Math.floor(0xffffffff / max) * max;
    const buf = new Uint32Array(1);
    let v = 0;
    do {
      g.getRandomValues(buf);
      v = buf[0];
    } while (v >= limit);
    return v % max;
  }
  return Math.floor(Math.random() * max);
}

/**
 * Human-readable gate pass number, e.g. V-260613-A4F1 (date + crypto-random tail).
 *
 * The tail is a crypto-random base-36 token, NOT a function of the clock — the old
 * `seconds % 10000` tail collided for any two check-ins in the same second and was
 * trivially predictable. NOTE: this is collision-RESISTANT, not guaranteed unique;
 * true uniqueness needs an atomic per-school counter (see `finance_counters` /
 * `certificate_counters`). The doc id from `addDoc` remains the real unique key.
 */
export function generatePassNo(now = new Date()): string {
  const ymd = `${pad(now.getFullYear() % 100, 2)}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}`;
  // 4 base-36 chars = ~1.6M space; crypto-random so two same-second passes differ.
  const tail = secureInt(36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');
  return `V-${ymd}-${tail}`;
}

/** 4-digit gate OTP for the host to verify the visitor (crypto-random). */
export function generateOtp(): string {
  return pad(secureInt(10000), 4);
}
