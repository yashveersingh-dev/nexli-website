import {
  addDoc, deleteDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where,
  limit as fsLimit, type QueryConstraint,
} from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection, useDocument } from '@/lib/db';
import { writeAuditEvent, type AuditAction } from '@/lib/audit';
import type {
  Vehicle, TransportRoute, TransportMember, BusAttendance, SosAlert, VehiclePosition,
  HostelBlock, HostelRoom, HostelAllocation, HostelRollcall, ExeatPass,
  MedicalRecord, ClinicVisit, Immunization,
  VisitorLog, BlacklistEntry,
  CanteenMenu, MealHeadcount, CanteenFeedback, CanteenInspection,
  Asset, Facility, MaintenanceRequest,
} from '@/types/ops';

/**
 * Shared Operations & Safety (P6) data layer. Tenant-scoped collections under
 * `schools/{schoolId}/…`. Medical/immunization use the rules-RESTRICTED `medical`
 * + `immunization` collections (nurse/doctor/principal/vp_admin only). All P6
 * modules read/write through here. `actor = { uid, name }`.
 */
export interface Actor { uid: string; name?: string }

function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

export async function createIn<T extends object>(schoolId: string, sub: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, sub), { ...stripUndefined(data), schoolId, createdAt: Date.now(), createdBy: actor.uid, serverCreatedAt: serverTimestamp(), version: 1 });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: ref.id, summary: audit.summary });
  return ref.id;
}
export async function setIn<T extends object>(schoolId: string, sub: string, id: string, data: T, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await setDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(data), schoolId, lastModifiedAt: Date.now(), lastModifiedBy: actor.uid }, { merge: true });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
export async function updateIn<T extends object>(schoolId: string, sub: string, id: string, patch: Partial<T>, actor: Actor, audit?: { action: AuditAction; targetType?: string; summary?: string }): Promise<void> {
  await updateDoc(tenantDoc(schoolId, sub, id), { ...stripUndefined(patch), lastModifiedAt: Date.now(), lastModifiedBy: actor.uid });
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id, summary: audit.summary });
}
export async function removeIn(schoolId: string, sub: string, id: string, actor: Actor, audit?: { action: AuditAction; targetType?: string }): Promise<void> {
  await deleteDoc(tenantDoc(schoolId, sub, id));
  if (audit) void writeAuditEvent({ action: audit.action, schoolId, actor, targetType: audit.targetType, targetId: id });
}

/* ============================ Transport ============================ */
export function useVehicles(schoolId?: string) {
  return useCollection<Vehicle>(schoolId ? tenantCol(schoolId, 'vehicles') : null, [schoolId]);
}
export const createVehicle = (s: string, d: Omit<Vehicle, 'id'>, a: Actor) => createIn(s, 'vehicles', d, a, { action: 'vehicle.created', targetType: 'vehicle', summary: d.regNo });
export const updateVehicle = (s: string, id: string, p: Partial<Vehicle>, a: Actor) => updateIn(s, 'vehicles', id, p, a, { action: 'vehicle.updated', targetType: 'vehicle' });
export const deleteVehicle = (s: string, id: string, a: Actor) => removeIn(s, 'vehicles', id, a, { action: 'vehicle.deleted', targetType: 'vehicle' });

export function useRoutes(schoolId?: string) {
  return useCollection<TransportRoute>(schoolId ? tenantCol(schoolId, 'transport_routes') : null, [schoolId]);
}
export function useRoute(schoolId?: string, id?: string) {
  return useDocument<TransportRoute>(schoolId && id ? tenantDoc(schoolId, 'transport_routes', id) : null);
}
export const createRoute = (s: string, d: Omit<TransportRoute, 'id'>, a: Actor) => createIn(s, 'transport_routes', d, a, { action: 'route.created', targetType: 'route', summary: d.name });
export const updateRoute = (s: string, id: string, p: Partial<TransportRoute>, a: Actor) => updateIn(s, 'transport_routes', id, p, a, { action: 'route.updated', targetType: 'route' });
export const deleteRoute = (s: string, id: string, a: Actor) => removeIn(s, 'transport_routes', id, a, { action: 'route.deleted', targetType: 'route' });

export function useTransportMembers(schoolId?: string, routeId?: string) {
  return useCollection<TransportMember>(schoolId ? (routeId ? query(tenantCol(schoolId, 'transport_members'), where('routeId', '==', routeId)) : tenantCol(schoolId, 'transport_members')) : null, [schoolId, routeId]);
}
export const createTransportMember = (s: string, d: Omit<TransportMember, 'id'>, a: Actor) => createIn(s, 'transport_members', d, a, { action: 'transport.assigned', targetType: 'transport_member', summary: d.studentName });
export const updateTransportMember = (s: string, id: string, p: Partial<TransportMember>, a: Actor) => updateIn(s, 'transport_members', id, p, a);
export const removeTransportMember = (s: string, id: string, a: Actor) => removeIn(s, 'transport_members', id, a, { action: 'transport.unassigned', targetType: 'transport_member' });

export const busAttendanceId = (routeId: string, date: string, trip: string) => `${routeId}_${date}_${trip}`;
export function useBusAttendance(schoolId?: string, routeId?: string, date?: string, trip?: string) {
  return useDocument<BusAttendance>(schoolId && routeId && date && trip ? tenantDoc(schoolId, 'bus_attendance', busAttendanceId(routeId, date, trip)) : null);
}
export function useAllBusAttendance(schoolId?: string) {
  return useCollection<BusAttendance>(schoolId ? tenantCol(schoolId, 'bus_attendance') : null, [schoolId]);
}
export async function saveBusAttendance(schoolId: string, d: Omit<BusAttendance, 'id'>, a: Actor) {
  await setIn(schoolId, 'bus_attendance', busAttendanceId(d.routeId, d.date, d.trip), { ...d, markedByUid: a.uid, markedByName: a.name, markedAt: Date.now() }, a, { action: 'bus.attendance_marked', targetType: 'bus_attendance', summary: `${d.routeName ?? d.routeId} ${d.date}` });
}

export function useSosAlerts(schoolId?: string) {
  return useCollection<SosAlert>(schoolId ? query(tenantCol(schoolId, 'sos_alerts'), orderBy('raisedAt', 'desc')) : null, [schoolId]);
}
export const raiseSos = (s: string, d: Omit<SosAlert, 'id'>, a: Actor) => createIn(s, 'sos_alerts', d, a, { action: 'sos.raised', targetType: 'sos', summary: `${d.type} · ${d.routeName ?? d.vehicleRegNo ?? ''}` });
export const updateSos = (s: string, id: string, p: Partial<SosAlert>, a: Actor) => updateIn(s, 'sos_alerts', id, p, a, { action: 'sos.updated', targetType: 'sos' });

export function useVehiclePositions(schoolId?: string) {
  return useCollection<VehiclePosition>(schoolId ? tenantCol(schoolId, 'vehicle_positions') : null, [schoolId]);
}
export const saveVehiclePosition = (s: string, vehicleId: string, d: Omit<VehiclePosition, 'id'>, a: Actor) => setIn(s, 'vehicle_positions', vehicleId, d, a);

/* ============================ Hostel ============================ */
export function useHostelBlocks(schoolId?: string) {
  return useCollection<HostelBlock>(schoolId ? tenantCol(schoolId, 'hostel_blocks') : null, [schoolId]);
}
export const createHostelBlock = (s: string, d: Omit<HostelBlock, 'id'>, a: Actor) => createIn(s, 'hostel_blocks', d, a, { action: 'hostel.block_created', targetType: 'hostel_block', summary: d.name });
export const updateHostelBlock = (s: string, id: string, p: Partial<HostelBlock>, a: Actor) => updateIn(s, 'hostel_blocks', id, p, a);
export const deleteHostelBlock = (s: string, id: string, a: Actor) => removeIn(s, 'hostel_blocks', id, a, { action: 'hostel.block_deleted', targetType: 'hostel_block' });

export function useHostelRooms(schoolId?: string, blockId?: string) {
  return useCollection<HostelRoom>(schoolId ? (blockId ? query(tenantCol(schoolId, 'hostel_rooms'), where('blockId', '==', blockId)) : tenantCol(schoolId, 'hostel_rooms')) : null, [schoolId, blockId]);
}
export const createHostelRoom = (s: string, d: Omit<HostelRoom, 'id'>, a: Actor) => createIn(s, 'hostel_rooms', d, a, { action: 'hostel.room_created', targetType: 'hostel_room' });
export const updateHostelRoom = (s: string, id: string, p: Partial<HostelRoom>, a: Actor) => updateIn(s, 'hostel_rooms', id, p, a);
export const deleteHostelRoom = (s: string, id: string, a: Actor) => removeIn(s, 'hostel_rooms', id, a, { action: 'hostel.room_deleted', targetType: 'hostel_room' });

export function useHostelAllocations(schoolId?: string) {
  return useCollection<HostelAllocation>(schoolId ? tenantCol(schoolId, 'hostel_allocations') : null, [schoolId]);
}
export const createAllocation = (s: string, d: Omit<HostelAllocation, 'id'>, a: Actor) => createIn(s, 'hostel_allocations', d, a, { action: 'hostel.allocated', targetType: 'hostel_allocation', summary: d.studentName });
export const updateAllocation = (s: string, id: string, p: Partial<HostelAllocation>, a: Actor) => updateIn(s, 'hostel_allocations', id, p, a);
export const removeAllocation = (s: string, id: string, a: Actor) => removeIn(s, 'hostel_allocations', id, a, { action: 'hostel.deallocated', targetType: 'hostel_allocation' });

export const rollcallId = (blockId: string, date: string, session: string) => `${blockId}_${date}_${session}`;
export function useRollcall(schoolId?: string, blockId?: string, date?: string, session?: string) {
  return useDocument<HostelRollcall>(schoolId && blockId && date && session ? tenantDoc(schoolId, 'hostel_rollcall', rollcallId(blockId, date, session)) : null);
}
export async function saveRollcall(schoolId: string, d: Omit<HostelRollcall, 'id'>, a: Actor) {
  await setIn(schoolId, 'hostel_rollcall', rollcallId(d.blockId, d.date, d.session), { ...d, takenByName: a.name, takenAt: Date.now() }, a, { action: 'hostel.rollcall', targetType: 'hostel_rollcall', summary: `${d.blockName ?? d.blockId} ${d.date} ${d.session}` });
}

export function useExeatPasses(schoolId?: string) {
  return useCollection<ExeatPass>(schoolId ? tenantCol(schoolId, 'exeat_passes') : null, [schoolId]);
}
export const createExeat = (s: string, d: Omit<ExeatPass, 'id'>, a: Actor) => createIn(s, 'exeat_passes', d, a, { action: 'exeat.requested', targetType: 'exeat', summary: d.studentName });
export const updateExeat = (s: string, id: string, p: Partial<ExeatPass>, a: Actor) => updateIn(s, 'exeat_passes', id, p, a, { action: 'exeat.updated', targetType: 'exeat' });

/* =================== Medical & clinic (RESTRICTED) =================== */
export function useMedicalRecords(schoolId?: string) {
  return useCollection<MedicalRecord>(schoolId ? query(tenantCol(schoolId, 'medical'), where('kind', '==', 'record')) : null, [schoolId]);
}
export function useMedicalRecord(schoolId?: string, id?: string) {
  return useDocument<MedicalRecord>(schoolId && id ? tenantDoc(schoolId, 'medical', id) : null);
}
export const createMedicalRecord = (s: string, d: Omit<MedicalRecord, 'id'>, a: Actor) => createIn(s, 'medical', d, a, { action: 'medical.record_created', targetType: 'medical', summary: d.studentName });
export const updateMedicalRecord = (s: string, id: string, p: Partial<MedicalRecord>, a: Actor) => updateIn(s, 'medical', id, p, a, { action: 'medical.record_updated', targetType: 'medical' });

export function useClinicVisits(schoolId?: string) {
  return useCollection<ClinicVisit>(schoolId ? query(tenantCol(schoolId, 'medical'), where('kind', '==', 'visit')) : null, [schoolId]);
}
export const createClinicVisit = (s: string, d: Omit<ClinicVisit, 'id'>, a: Actor) => createIn(s, 'medical', d, a, { action: 'medical.visit_logged', targetType: 'clinic_visit', summary: d.studentName });
export const updateClinicVisit = (s: string, id: string, p: Partial<ClinicVisit>, a: Actor) => updateIn(s, 'medical', id, p, a);

export function useImmunizations(schoolId?: string, studentId?: string) {
  return useCollection<Immunization>(schoolId ? (studentId ? query(tenantCol(schoolId, 'immunization'), where('studentId', '==', studentId)) : tenantCol(schoolId, 'immunization')) : null, [schoolId, studentId]);
}
export const createImmunization = (s: string, d: Omit<Immunization, 'id'>, a: Actor) => createIn(s, 'immunization', d, a, { action: 'medical.immunization_added', targetType: 'immunization', summary: `${d.studentName} · ${d.vaccine}` });
export const updateImmunization = (s: string, id: string, p: Partial<Immunization>, a: Actor) => updateIn(s, 'immunization', id, p, a);
export const deleteImmunization = (s: string, id: string, a: Actor) => removeIn(s, 'immunization', id, a, { action: 'medical.immunization_deleted', targetType: 'immunization' });

/* ============================ Visitor & gate ============================ */
export function useVisitors(schoolId?: string) {
  return useCollection<VisitorLog>(schoolId ? tenantCol(schoolId, 'visitors') : null, [schoolId]);
}
export function useVisitor(schoolId?: string, id?: string) {
  return useDocument<VisitorLog>(schoolId && id ? tenantDoc(schoolId, 'visitors', id) : null);
}
export const createVisitor = (s: string, d: Omit<VisitorLog, 'id'>, a: Actor) => createIn(s, 'visitors', d, a, { action: 'visitor.logged', targetType: 'visitor', summary: d.name });
export const updateVisitor = (s: string, id: string, p: Partial<VisitorLog>, a: Actor) => updateIn(s, 'visitors', id, p, a, { action: 'visitor.updated', targetType: 'visitor' });
export const deleteVisitor = (s: string, id: string, a: Actor) => removeIn(s, 'visitors', id, a, { action: 'visitor.deleted', targetType: 'visitor' });

export function useBlacklist(schoolId?: string) {
  return useCollection<BlacklistEntry>(schoolId ? tenantCol(schoolId, 'visitor_blacklist') : null, [schoolId]);
}
export const createBlacklist = (s: string, d: Omit<BlacklistEntry, 'id'>, a: Actor) => createIn(s, 'visitor_blacklist', d, a, { action: 'visitor.blacklisted', targetType: 'blacklist', summary: d.name });
export const updateBlacklist = (s: string, id: string, p: Partial<BlacklistEntry>, a: Actor) => updateIn(s, 'visitor_blacklist', id, p, a);
export const deleteBlacklist = (s: string, id: string, a: Actor) => removeIn(s, 'visitor_blacklist', id, a, { action: 'visitor.unblacklisted', targetType: 'blacklist' });

/* ============================ Canteen ============================ */
export function useCanteenMenus(schoolId?: string) {
  return useCollection<CanteenMenu>(schoolId ? tenantCol(schoolId, 'canteen_menu') : null, [schoolId]);
}
export const createMenu = (s: string, d: Omit<CanteenMenu, 'id'>, a: Actor) => createIn(s, 'canteen_menu', d, a, { action: 'canteen.menu_set', targetType: 'canteen_menu' });
export const updateMenu = (s: string, id: string, p: Partial<CanteenMenu>, a: Actor) => updateIn(s, 'canteen_menu', id, p, a);
export const deleteMenu = (s: string, id: string, a: Actor) => removeIn(s, 'canteen_menu', id, a, { action: 'canteen.menu_deleted', targetType: 'canteen_menu' });

export function useHeadcounts(schoolId?: string) {
  return useCollection<MealHeadcount>(schoolId ? tenantCol(schoolId, 'meal_headcount') : null, [schoolId]);
}
export const saveHeadcount = (s: string, d: Omit<MealHeadcount, 'id'>, a: Actor) => createIn(s, 'meal_headcount', d, a, { action: 'canteen.headcount', targetType: 'headcount' });

export function useCanteenFeedback(schoolId?: string) {
  return useCollection<CanteenFeedback>(schoolId ? tenantCol(schoolId, 'canteen_feedback') : null, [schoolId]);
}
export const createFeedback = (s: string, d: Omit<CanteenFeedback, 'id'>, a: Actor) => createIn(s, 'canteen_feedback', d, a, { action: 'canteen.feedback', targetType: 'feedback' });

export function useCanteenInspections(schoolId?: string) {
  return useCollection<CanteenInspection>(schoolId ? tenantCol(schoolId, 'canteen_inspections') : null, [schoolId]);
}
export const createInspection = (s: string, d: Omit<CanteenInspection, 'id'>, a: Actor) => createIn(s, 'canteen_inspections', d, a, { action: 'canteen.inspection', targetType: 'inspection' });

/* ============================ Asset & facility ============================ */
export function useAssets(schoolId?: string) {
  return useCollection<Asset>(schoolId ? tenantCol(schoolId, 'assets') : null, [schoolId]);
}
export const createAsset = (s: string, d: Omit<Asset, 'id'>, a: Actor) => createIn(s, 'assets', d, a, { action: 'asset.created', targetType: 'asset', summary: d.name });
export const updateAsset = (s: string, id: string, p: Partial<Asset>, a: Actor) => updateIn(s, 'assets', id, p, a, { action: 'asset.updated', targetType: 'asset' });
export const deleteAsset = (s: string, id: string, a: Actor) => removeIn(s, 'assets', id, a, { action: 'asset.deleted', targetType: 'asset' });

export function useFacilities(schoolId?: string) {
  return useCollection<Facility>(schoolId ? tenantCol(schoolId, 'facilities') : null, [schoolId]);
}
export const createFacility = (s: string, d: Omit<Facility, 'id'>, a: Actor) => createIn(s, 'facilities', d, a, { action: 'facility.created', targetType: 'facility', summary: d.name });
export const updateFacility = (s: string, id: string, p: Partial<Facility>, a: Actor) => updateIn(s, 'facilities', id, p, a);
export const deleteFacility = (s: string, id: string, a: Actor) => removeIn(s, 'facilities', id, a, { action: 'facility.deleted', targetType: 'facility' });

export function useMaintenance(schoolId?: string) {
  return useCollection<MaintenanceRequest>(schoolId ? tenantCol(schoolId, 'maintenance_requests') : null, [schoolId]);
}
export const createMaintenance = (s: string, d: Omit<MaintenanceRequest, 'id'>, a: Actor) => createIn(s, 'maintenance_requests', d, a, { action: 'maintenance.created', targetType: 'maintenance', summary: d.title });
export const updateMaintenance = (s: string, id: string, p: Partial<MaintenanceRequest>, a: Actor) => updateIn(s, 'maintenance_requests', id, p, a, { action: 'maintenance.updated', targetType: 'maintenance' });
export const deleteMaintenance = (s: string, id: string, a: Actor) => removeIn(s, 'maintenance_requests', id, a, { action: 'maintenance.deleted', targetType: 'maintenance' });

/* ---------------- one-shot ---------------- */
export async function opsQueryOnce<T>(schoolId: string, sub: string, ...c: QueryConstraint[]): Promise<T[]> {
  const snap = await getDocs(query(tenantCol(schoolId, sub), ...c, fsLimit(2000)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
}
export { where, orderBy };
