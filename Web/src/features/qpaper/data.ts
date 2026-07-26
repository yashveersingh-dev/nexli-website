import { addDoc, deleteDoc, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { tenantCol, tenantDoc, useCollection, useDocument } from '@/lib/db';
import { writeAuditEvent } from '@/lib/audit';
import type { TenantRecord } from '@/types/models';
import type { Question, QuestionPaper, PaperBlueprint } from '@/types/qpaper';

/**
 * Question Paper Generator data layer — tenant-scoped CRUD over three
 * subcollections. Uses `tenantCol`/`tenantDoc` directly (no new helpers in
 * lib/db.ts) and the live `useCollection`/`useDocument` hooks. All writes are
 * fire-and-forget audited and `undefined` fields are stripped (Firestore rejects
 * `undefined`).
 */

export interface Actor {
  uid: string;
  name?: string;
}

const BANK = 'questionBank';
const PAPERS = 'questionPapers';
const BLUEPRINTS = 'paperBlueprints';

/** Drop `undefined` values — Firestore writes reject them. */
function clean<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k as keyof T] = v as T[keyof T];
  return out;
}

/* ============================ Question bank ============================ */

export function useQuestions(schoolId?: string) {
  return useCollection<Question>(
    schoolId ? query(tenantCol(schoolId, BANK), orderBy('createdAt', 'desc')) : null,
    [schoolId],
  );
}

export function useQuestion(schoolId?: string, id?: string) {
  return useDocument<Question>(schoolId && id ? tenantDoc(schoolId, BANK, id) : null);
}

export async function createQuestion(schoolId: string, data: Omit<Question, 'id'>, actor: Actor): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, BANK), {
    ...clean(data),
    schoolId,
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
    version: 1,
  });
  void writeAuditEvent({
    action: 'qpaper.question_created',
    schoolId,
    actor,
    targetType: 'question',
    targetId: ref.id,
    summary: data.stem.slice(0, 80),
  });
  return ref.id;
}

export async function updateQuestion(
  schoolId: string,
  id: string,
  patch: Partial<Question>,
  actor: Actor,
): Promise<void> {
  await updateDoc(tenantDoc(schoolId, BANK, id), {
    ...clean(patch),
    lastModifiedAt: Date.now(),
    lastModifiedBy: actor.uid,
  });
  void writeAuditEvent({ action: 'qpaper.question_updated', schoolId, actor, targetType: 'question', targetId: id });
}

export async function deleteQuestion(schoolId: string, id: string, actor: Actor): Promise<void> {
  await deleteDoc(tenantDoc(schoolId, BANK, id));
  void writeAuditEvent({ action: 'qpaper.question_deleted', schoolId, actor, targetType: 'question', targetId: id });
}

/* ============================ Papers ============================ */

export function usePapers(schoolId?: string) {
  return useCollection<QuestionPaper>(
    schoolId ? query(tenantCol(schoolId, PAPERS), orderBy('createdAt', 'desc')) : null,
    [schoolId],
  );
}

export function usePaper(schoolId?: string, id?: string) {
  return useDocument<QuestionPaper>(schoolId && id ? tenantDoc(schoolId, PAPERS, id) : null);
}

export async function createPaper(schoolId: string, data: Omit<QuestionPaper, 'id'>, actor: Actor): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, PAPERS), {
    ...clean(data),
    schoolId,
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
    version: 1,
  });
  void writeAuditEvent({
    action: 'qpaper.paper_created',
    schoolId,
    actor,
    targetType: 'paper',
    targetId: ref.id,
    summary: data.title,
  });
  return ref.id;
}

export async function updatePaper(
  schoolId: string,
  id: string,
  patch: Partial<QuestionPaper>,
  actor: Actor,
): Promise<void> {
  await updateDoc(tenantDoc(schoolId, PAPERS, id), {
    ...clean(patch),
    lastModifiedAt: Date.now(),
    lastModifiedBy: actor.uid,
  });
  void writeAuditEvent({ action: 'qpaper.paper_updated', schoolId, actor, targetType: 'paper', targetId: id });
}

export async function deletePaper(schoolId: string, id: string, actor: Actor): Promise<void> {
  await deleteDoc(tenantDoc(schoolId, PAPERS, id));
  void writeAuditEvent({ action: 'qpaper.paper_deleted', schoolId, actor, targetType: 'paper', targetId: id });
}

/** Clone an existing paper (drops identity + resets to draft). Returns the new id. */
export async function clonePaper(schoolId: string, paper: QuestionPaper, actor: Actor): Promise<string> {
  const { id: _id, createdAt: _c, createdBy: _cb, lastModifiedAt: _m, lastModifiedBy: _mb, version: _v, ...rest } =
    paper;
  return createPaper(
    schoolId,
    { ...rest, title: `${paper.title} (copy)`, status: 'draft' },
    actor,
  );
}

/* ============================ Blueprints ============================ */

export function useBlueprints(schoolId?: string) {
  return useCollection<PaperBlueprint>(
    schoolId ? query(tenantCol(schoolId, BLUEPRINTS), orderBy('createdAt', 'desc')) : null,
    [schoolId],
  );
}

export async function createBlueprint(
  schoolId: string,
  data: Omit<PaperBlueprint, 'id'>,
  actor: Actor,
): Promise<string> {
  const ref = await addDoc(tenantCol(schoolId, BLUEPRINTS), {
    ...clean(data),
    schoolId,
    createdAt: Date.now(),
    createdBy: actor.uid,
    serverCreatedAt: serverTimestamp(),
    version: 1,
  });
  void writeAuditEvent({
    action: 'qpaper.blueprint_created',
    schoolId,
    actor,
    targetType: 'blueprint',
    targetId: ref.id,
    summary: data.name,
  });
  return ref.id;
}

/* ============================ Bulk seed ============================ */

/**
 * Write a batch of sample questions to the tenant bank (demo population). Uses
 * deterministic ids so re-running overwrites rather than duplicating.
 */
export async function seedQuestions(
  schoolId: string,
  questions: { id: string; data: Omit<Question, keyof TenantRecord> }[],
  actor: Actor,
): Promise<number> {
  let written = 0;
  for (const q of questions) {
    await setDoc(
      tenantDoc(schoolId, BANK, q.id),
      {
        ...clean(q.data),
        schoolId,
        createdAt: Date.now(),
        createdBy: actor.uid,
        serverCreatedAt: serverTimestamp(),
        version: 1,
      },
      { merge: true },
    );
    written++;
  }
  void writeAuditEvent({
    action: 'qpaper.questions_seeded',
    schoolId,
    actor,
    targetType: 'question',
    summary: `${written} sample questions`,
  });
  return written;
}
