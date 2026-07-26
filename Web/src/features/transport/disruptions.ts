import { orderBy, query } from 'firebase/firestore';
import { tenantCol, useCollection } from '@/lib/db';
import { createIn, updateIn, type Actor } from '@/features/ops/data';
import type { TransportDisruption, TransportNotification } from '@/types/ops';

/**
 * Route-disruption SOP (ROLE_AUDIT §7d) data layer — transport-local so the
 * shared ops/data.ts is untouched. Reuses the generic `createIn`/`updateIn`
 * helpers (tenant-scoped, audited) from ops/data.ts.
 *
 * Spark plan: no Cloud Functions / SMS backend. Parent notification is recorded
 * in-app only via {@link notifyTransport} (see the seam note below).
 */

const DISRUPTIONS = 'transport_disruptions';
const NOTIFICATIONS = 'transport_notifications';

/* --------------------------- Disruptions (log) ---------------------------- */

export function useDisruptions(schoolId?: string) {
  return useCollection<TransportDisruption>(
    schoolId ? query(tenantCol(schoolId, DISRUPTIONS), orderBy('reportedAt', 'desc')) : null,
    [schoolId],
  );
}

export const reportDisruption = (s: string, d: Omit<TransportDisruption, 'id'>, a: Actor) =>
  createIn(s, DISRUPTIONS, d, a, {
    action: 'transport.disruption_reported',
    targetType: 'transport_disruption',
    summary: `${d.routeName ?? d.routeId} · ${d.cause} · ${d.date}`,
  });

export const updateDisruption = (s: string, id: string, p: Partial<TransportDisruption>, a: Actor) =>
  updateIn(s, DISRUPTIONS, id, p, a, { action: 'transport.disruption_updated', targetType: 'transport_disruption' });

/* ------------------------- Notification log (read) ------------------------ */

export function useTransportNotifications(schoolId?: string) {
  return useCollection<TransportNotification>(
    schoolId ? query(tenantCol(schoolId, NOTIFICATIONS), orderBy('sentAt', 'desc')) : null,
    [schoolId],
  );
}

/* ============================================================================
 * NOTIFICATION SEAM — notifyTransport(...)
 * ----------------------------------------------------------------------------
 * The single, typed entry point for *all* parent transport notifications.
 *
 * TODAY (Spark plan): writes one in-app `transport_notifications` record with
 * status 'notified' and channel 'in_app'. Nothing leaves the app.
 *
 * FUTURE (drop-in, no call-site changes): when a Cloud Function SMS/push
 * provider exists, route this through it instead — e.g.
 *
 *   const sendTransportNotice = httpsCallable(functions, 'sendTransportNotice');
 *   await sendTransportNotice({ schoolId, ...input });   // fans out SMS/push
 *
 * The function would still write the same in-app record (audit trail) and add
 * channel 'sms' | 'push'. Because every caller goes through notifyTransport()
 * and only depends on TransportNotifyInput/TransportNotifyResult, swapping the
 * implementation is a one-file change here — no UI edits.
 * ==========================================================================*/

export interface TransportNotifyInput {
  disruptionId: string;
  routeId: string;
  routeName?: string;
  date: string;
  /** Resolution message parents see (backup / merge / cancel + revised ETA). */
  message: string;
  /** Who the notice targets, e.g. "Parents on Route 3". */
  audience: string;
  /** Best-known affected-parent count (for the log; optional). */
  recipientCount?: number;
}

export interface TransportNotifyResult {
  notificationId: string;
  notifiedAt: number;
}

/**
 * Record a parent transport notification. In-app only on the Spark plan; the
 * future SMS/push provider drops in behind this same signature (see seam note).
 */
export async function notifyTransport(
  schoolId: string,
  input: TransportNotifyInput,
  actor: Actor,
): Promise<TransportNotifyResult> {
  const sentAt = Date.now();
  const record: Omit<TransportNotification, 'id'> = {
    schoolId,
    disruptionId: input.disruptionId,
    routeId: input.routeId,
    routeName: input.routeName,
    date: input.date,
    channel: 'in_app',
    message: input.message,
    audience: input.audience,
    recipientCount: input.recipientCount,
    status: 'notified',
    sentByName: actor.name,
    sentAt,
  };
  const notificationId = await createIn(schoolId, NOTIFICATIONS, record, actor, {
    action: 'transport.parents_notified',
    targetType: 'transport_notification',
    summary: `${input.routeName ?? input.routeId} · ${input.date}`,
  });
  return { notificationId, notifiedAt: sentAt };
}
