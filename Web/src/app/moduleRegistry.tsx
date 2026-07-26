import type { ComponentType } from 'react';
import type { NavAudience } from '@/app/nav';

/**
 * Module route-tree registry — the single integration seam between the app shell
 * and feature modules. As each module is built (P2→P8), register its routed
 * subtree component here under the matching audience + nav id. Anything not
 * registered falls back to a polished `ModuleStub`, so navigation is never dead.
 *
 * Components SHOULD be `React.lazy(() => import('@/features/<m>/routes'))` so each
 * module ships as its own code-split chunk (keeps the first load light on old
 * Android). Each registered component renders its own nested `<Routes>` (it is
 * mounted at `/<navPath>/*`), giving modules list/detail/`/new`/`/:id/edit` pages.
 */
export type ModuleComponent = ComponentType;

type AudienceRegistry = Partial<Record<string, ModuleComponent>>;

const REGISTRY: Record<NavAudience, AudienceRegistry> = {
  platform: {},
  staff: {},
  parent: {},
  student: {},
  alumni: {},
};

/** Look up a module's route component for an audience + nav id (or null → stub). */
export function moduleComponent(audience: NavAudience, navId: string): ModuleComponent | null {
  return REGISTRY[audience]?.[navId] ?? null;
}

/** Register (or override) a module route component. Called from `registerModules`. */
export function registerModule(audience: NavAudience, navId: string, component: ModuleComponent): void {
  REGISTRY[audience][navId] = component;
}
