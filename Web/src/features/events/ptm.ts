import {
  addDoc, collection, doc, getDocs, query, runTransaction, serverTimestamp, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { tenantCol, tenantDoc, useCollection } from '@/lib/db';

/**
 * Parent-Teacher Meeting (PTM) scheduling.
 *
 * Staff create a meeting with bookable time slots; parents book ONE slot per
 * child. Slot capacity is enforced ATOMICALLY in a `runTransaction` (count
 * existing `booked` bookings for the slot, reject when full) — the same source-
 * of-truth pattern hostel allocation uses, so two parents racing the last seat
 * can never both win.
 *
 * Collections (NEW):
 *   - `schools/{schoolId}/ptm_meetings`
 *   - `schools/{schoolId}/ptm_bookings`
 *
 * The PURE availability logic (`slotAvailability`, `isSlotFull`,
 * `remainingForSlot`) is unit-tested in `./ptm.test.ts`.
 */

const MEETINGS = 'ptm_meetings';
const BOOKINGS = 'ptm_bookings';

export interface PtmSlot {
  id: string;
  /** Display time, e.g. "10:00 AM" or "10:00–10:10". */
  time: string;
  capacity: number;
}

export interface PtmMeeting {
  id: string;
  schoolId: string;
  title: string;
  /** Meeting day (epoch ms, start of day). */
  date: number;
  sectionId?: string;
  gradeId?: string;
  slots: PtmSlot[];
  note?: string;
  createdByUid: string;
  createdByName?: string;
  createdAt?: number;
}

export type PtmBookingStatus = 'booked' | 'cancelled';

export interface PtmBooking {
  id: string;
  schoolId: string;
  meetingId: string;
  slotId: string;
  studentId: string;
  studentName: string;
  parentUid: string;
  parentName: string;
  status: PtmBookingStatus;
  /** Denormalised slot time so the roster/booking list reads without a join. */
  slotTime?: string;
  createdAt?: number;
}

export interface Actor {
  uid: string;
  name?: string;
}

/* ============================ PURE capacity logic ============================ */

/** Count of ACTIVE (booked, non-cancelled) bookings per slotId. */
export function bookedCountBySlot(bookings: readonly PtmBooking[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const b of bookings) {
    if (b.status !== 'booked') continue;
    m.set(b.slotId, (m.get(b.slotId) ?? 0) + 1);
  }
  return m;
}

/** Remaining seats for a slot given its current active booking count. */
export function remainingForSlot(slot: PtmSlot, booked: number): number {
  return Math.max(0, (slot.capacity ?? 0) - booked);
}

/** True when a slot has no free seats. */
export function isSlotFull(slot: PtmSlot, booked: number): boolean {
  return remainingForSlot(slot, booked) <= 0;
}

export interface SlotAvailability {
  slot: PtmSlot;
  booked: number;
  remaining: number;
  full: boolean;
}

/**
 * Per-slot availability for a meeting, derived from its slots + the active
 * bookings across the meeting. Pure — drives the UI and is unit-tested.
 */
export function slotAvailability(meeting: Pick<PtmMeeting, 'slots'>, bookings: readonly PtmBooking[]): SlotAvailability[] {
  const counts = bookedCountBySlot(bookings);
  return meeting.slots.map((slot) => {
    const booked = counts.get(slot.id) ?? 0;
    const remaining = remainingForSlot(slot, booked);
    return { slot, booked, remaining, full: remaining <= 0 };
  });
}

/** Whether a parent has already booked any slot of a meeting for a given child. */
export function hasActiveBooking(
  bookings: readonly PtmBooking[],
  meetingId: string,
  studentId: string,
): PtmBooking | undefined {
  return bookings.find((b) => b.meetingId === meetingId && b.studentId === studentId && b.status === 'booked');
}

/** Stable id for a new slot row in the meeting form. */
export function newSlotId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ============================ Data hooks ============================ */

export function usePtmMeetings(schoolId?: string) {
  return useCollection<PtmMeeting>(schoolId ? tenantCol(schoolId, MEETINGS) : null, [schoolId]);
}

/** All bookings for a meeting (staff roster + capacity counts). */
export function usePtmBookings(schoolId?: string, meetingId?: string) {
  const key = `${schoolId ?? ''}|${meetingId ?? ''}`;
  return useCollection<PtmBooking>(
    schoolId && meetingId ? query(tenantCol(schoolId, BOOKINGS), where('meetingId', '==', meetingId)) : null,
    [schoolId, meetingId],
    key,
  );
}

/** A parent's own bookings (across meetings) — scoped by parentUid. */
export function usePtmBookingsForParent(schoolId?: string, parentUid?: string) {
  return useCollection<PtmBooking>(
    schoolId && parentUid ? query(tenantCol(schoolId, BOOKINGS), where('parentUid', '==', parentUid)) : null,
    [schoolId, parentUid],
  );
}

/** Per-slot booked COUNT for a meeting (the `slot_counters` subcollection). Doc id = slotId.
 *  Counts only — no booker identity — so parents can read live availability without
 *  seeing other families' bookings. */
export interface SlotCount {
  id: string;
  count: number;
}
export function usePtmSlotCounts(schoolId?: string, meetingId?: string) {
  const key = `${schoolId ?? ''}|${meetingId ?? ''}`;
  return useCollection<SlotCount>(
    schoolId && meetingId ? tenantCol(schoolId, `${MEETINGS}/${meetingId}/slot_counters`) : null,
    [schoolId, meetingId],
    key,
  );
}

/** Availability derived from the privacy-safe per-slot counters (parent view). */
export function slotAvailabilityFromCounts(meeting: Pick<PtmMeeting, 'slots'>, counts: readonly SlotCount[]): SlotAvailability[] {
  const byId = new Map(counts.map((c) => [c.id, c.count]));
  return meeting.slots.map((slot) => {
    const booked = byId.get(slot.id) ?? 0;
    const remaining = remainingForSlot(slot, booked);
    return { slot, booked, remaining, full: remaining <= 0 };
  });
}

/* ============================ Writers ============================ */

export function createPtmMeeting(schoolId: string, data: Omit<PtmMeeting, 'id'>, actor: Actor): Promise<string> {
  return addDoc(tenantCol(schoolId, MEETINGS), {
    ...data,
    schoolId,
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
    version: 1,
  }).then((ref) => ref.id);
}

export interface BookSlotInput {
  meeting: PtmMeeting;
  slotId: string;
  studentId: string;
  studentName: string;
}

/** Error thrown when a slot is full at commit time. */
export const SLOT_FULL = 'SLOT_FULL';
/** Error thrown when the parent already holds a booking for this child + meeting. */
export const ALREADY_BOOKED = 'ALREADY_BOOKED';

/**
 * Book a slot ATOMICALLY. A Firestore transaction can't run an aggregate query,
 * so the per-slot occupancy is kept in a small COUNTER doc
 * (`ptm_meetings/{id}/slot_counters/{slotId}`) that this transaction reads and
 * bumps together with the booking — `count` is the source of truth, exactly like
 * hostel `occupied`. We reject (`SLOT_FULL`) when `count >= capacity`, so a stale
 * client snapshot can never overbook. A per-child GUARD doc
 * (`ptm_meetings/{id}/booked_students/{studentId}`) makes the second booking for
 * the same child + meeting reject (`ALREADY_BOOKED`). Returns the new booking id.
 */
export async function bookPtmSlot(schoolId: string, input: BookSlotInput, actor: Actor): Promise<string> {
  const { meeting, slotId, studentId, studentName } = input;
  const slot = meeting.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error('SLOT_NOT_FOUND');
  const capacity = slot.capacity ?? 0;

  const bookingsCol = collection(db, 'schools', schoolId, BOOKINGS);

  return runTransaction(db, async (tx) => {
    const counterRef = tenantDoc(schoolId, `${MEETINGS}/${meeting.id}/slot_counters`, slotId);
    const guardRef = tenantDoc(schoolId, `${MEETINGS}/${meeting.id}/booked_students`, studentId);

    const [counterSnap, guardSnap] = await Promise.all([tx.get(counterRef), tx.get(guardRef)]);

    if (guardSnap.exists() && (guardSnap.data()?.status ?? 'booked') === 'booked') {
      throw new Error(ALREADY_BOOKED);
    }

    const used = (counterSnap.data()?.count as number | undefined) ?? 0;
    if (capacity > 0 && used >= capacity) throw new Error(SLOT_FULL);

    const bookingRef = doc(bookingsCol);
    tx.set(bookingRef, {
      schoolId,
      meetingId: meeting.id,
      slotId,
      studentId,
      studentName,
      parentUid: actor.uid,
      parentName: actor.name ?? 'Parent',
      status: 'booked',
      slotTime: slot.time,
      createdAt: Date.now(),
      createdBy: actor.uid,
      serverCreatedAt: serverTimestamp(),
      version: 1,
    });
    tx.set(counterRef, { count: used + 1, slotId, schoolId }, { merge: true });
    tx.set(guardRef, { status: 'booked', bookingId: bookingRef.id, slotId, schoolId }, { merge: true });
    return bookingRef.id;
  });
}

/**
 * Cancel a booking ATOMICALLY: flip its status, decrement the slot counter
 * (floored at 0) and clear the per-child guard so the parent can rebook.
 */
export async function cancelPtmBooking(schoolId: string, booking: PtmBooking, actor: Actor): Promise<void> {
  const bookingRef = tenantDoc(schoolId, BOOKINGS, booking.id);
  const counterRef = tenantDoc(schoolId, `${MEETINGS}/${booking.meetingId}/slot_counters`, booking.slotId);
  const guardRef = tenantDoc(schoolId, `${MEETINGS}/${booking.meetingId}/booked_students`, booking.studentId);
  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const used = (counterSnap.data()?.count as number | undefined) ?? 0;
    tx.update(bookingRef, { status: 'cancelled', lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
    tx.set(counterRef, { count: Math.max(0, used - 1), slotId: booking.slotId, schoolId }, { merge: true });
    tx.set(guardRef, { status: 'cancelled', slotId: booking.slotId, schoolId }, { merge: true });
  });
}

/** One-shot fetch of a meeting's bookings (used to build a staff roster export). */
export async function fetchPtmBookings(schoolId: string, meetingId: string): Promise<PtmBooking[]> {
  const snap = await getDocs(query(tenantCol(schoolId, BOOKINGS), where('meetingId', '==', meetingId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as PtmBooking);
}
