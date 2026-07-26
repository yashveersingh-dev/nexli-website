import { z } from 'zod';
import type { RouteStop } from '@/types/ops';

/**
 * String-based (input === output) so it satisfies the kit `Form<T>` (`ZodType<T>`).
 * Numbers are coerced at submit; no `z.coerce`/`.default()` (they diverge in/out types).
 */
const stopSchema = z.object({
  name: z.string().trim().min(1, 'Stop name required'),
  time: z.string().trim().optional(),
  lat: z.string().trim().refine((v) => v === '' || !Number.isNaN(Number(v)), 'Invalid latitude'),
  lng: z.string().trim().refine((v) => v === '' || !Number.isNaN(Number(v)), 'Invalid longitude'),
});

export const routeSchema = z.object({
  name: z.string().trim().min(2, 'Route name required'),
  code: z.string().trim().optional(),
  shift: z.enum(['morning', 'afternoon', 'both']),
  vehicleId: z.string().optional(),
  monthlyFee: z.string().refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'Enter a valid amount'),
  status: z.enum(['active', 'inactive']),
  stops: z.array(stopSchema).min(1, 'Add at least one stop'),
});

export type RouteValues = z.infer<typeof routeSchema>;

export const SHIFT_OPTIONS: { value: RouteValues['shift']; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'both', label: 'Both shifts' },
];

export const emptyStop = (): RouteValues['stops'][number] => ({ name: '', time: '', lat: '', lng: '' });

export const emptyRoute: RouteValues = {
  name: '', code: '', shift: 'both', vehicleId: '', monthlyFee: '', status: 'active',
  stops: [emptyStop()],
};

/** Map form stop rows → typed RouteStop[] with order + numeric lat/lng. */
export function stopsToRecords(stops: RouteValues['stops']): RouteStop[] {
  return stops.map((s, i) => {
    const stop: RouteStop = { name: s.name.trim(), order: i + 1 };
    if (s.time?.trim()) stop.time = s.time.trim();
    if (s.lat?.trim() !== '' && !Number.isNaN(Number(s.lat))) stop.lat = Number(s.lat);
    if (s.lng?.trim() !== '' && !Number.isNaN(Number(s.lng))) stop.lng = Number(s.lng);
    return stop;
  });
}
