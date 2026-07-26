import { describe, it, expect } from 'vitest';
import {
  bookedCountBySlot, remainingForSlot, isSlotFull, slotAvailability, hasActiveBooking,
  type PtmBooking, type PtmSlot,
} from './ptm';

const slots: PtmSlot[] = [
  { id: 'a', time: '10:00', capacity: 2 },
  { id: 'b', time: '10:10', capacity: 1 },
  { id: 'c', time: '10:20', capacity: 0 }, // 0 = unlimited (no cap)
];

function booking(p: Partial<PtmBooking>): PtmBooking {
  return {
    id: Math.random().toString(36).slice(2),
    schoolId: 's', meetingId: 'm', slotId: 'a',
    studentId: 'stu', studentName: 'Stu',
    parentUid: 'p', parentName: 'P', status: 'booked',
    ...p,
  };
}

describe('bookedCountBySlot', () => {
  it('counts only active (booked) bookings per slot', () => {
    const m = bookedCountBySlot([
      booking({ slotId: 'a' }),
      booking({ slotId: 'a' }),
      booking({ slotId: 'a', status: 'cancelled' }),
      booking({ slotId: 'b' }),
    ]);
    expect(m.get('a')).toBe(2);
    expect(m.get('b')).toBe(1);
    expect(m.get('c')).toBeUndefined();
  });
});

describe('remainingForSlot / isSlotFull', () => {
  it('computes remaining seats and full state', () => {
    expect(remainingForSlot(slots[0], 0)).toBe(2);
    expect(remainingForSlot(slots[0], 2)).toBe(0);
    expect(isSlotFull(slots[0], 1)).toBe(false);
    expect(isSlotFull(slots[0], 2)).toBe(true);
    expect(isSlotFull(slots[1], 1)).toBe(true);
  });

  it('treats capacity 0 as full (no seats configured)', () => {
    // A 0-capacity slot has no bookable seats — full regardless of count.
    expect(isSlotFull(slots[2], 0)).toBe(true);
    expect(remainingForSlot(slots[2], 0)).toBe(0);
  });

  it('never returns negative remaining when overbooked', () => {
    expect(remainingForSlot(slots[1], 5)).toBe(0);
  });
});

describe('slotAvailability', () => {
  it('derives per-slot availability from active bookings', () => {
    const avail = slotAvailability({ slots }, [
      booking({ slotId: 'a' }),
      booking({ slotId: 'b' }),
      booking({ slotId: 'b', status: 'cancelled' }),
    ]);
    const byId = Object.fromEntries(avail.map((a) => [a.slot.id, a]));
    expect(byId.a.remaining).toBe(1);
    expect(byId.a.full).toBe(false);
    expect(byId.b.booked).toBe(1);
    expect(byId.b.full).toBe(true);
  });
});

describe('hasActiveBooking', () => {
  const bookings = [
    booking({ meetingId: 'm1', studentId: 'kid1', status: 'booked' }),
    booking({ meetingId: 'm1', studentId: 'kid2', status: 'cancelled' }),
  ];

  it('finds an active booking for a child + meeting', () => {
    expect(hasActiveBooking(bookings, 'm1', 'kid1')?.studentId).toBe('kid1');
  });

  it('ignores cancelled bookings and other meetings', () => {
    expect(hasActiveBooking(bookings, 'm1', 'kid2')).toBeUndefined();
    expect(hasActiveBooking(bookings, 'm2', 'kid1')).toBeUndefined();
  });
});
