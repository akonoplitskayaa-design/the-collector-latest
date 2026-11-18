/** Model-independent public core. */
export type Scalar = string | number | boolean | null;
export type CausalChoice = { id: string; label: string; next: string; fact: string; effects: Record<string, Scalar> };
export type CausalNode = { id: string; lines: string[]; choices: CausalChoice[] };
export type CausalGraph = { start: string; nodes: CausalNode[] };
export type RecordedEffect = { before: Scalar; after: Scalar };
export type EvidenceEvent = { sequence: number; from: string; choiceId: string; to: string; fact: string; effectChanges: Record<string, RecordedEffect> };
export type CausalSession = { sessionId: string; currentNode: string; world: Record<string, Scalar>; evidence: EvidenceEvent[] };
export class NarrativeError extends Error { code: string; constructor(code: string, message: string); }
export function inspectGraph(graph: CausalGraph): { valid: boolean; errors: string[]; warnings: string[]; reachableNodes: string[] };
export function startSession(graph: CausalGraph, sessionId?: string): CausalSession;
export function publicScene(graph: CausalGraph, session: CausalSession): { id: string; lines: string[]; choices: { id: string; label: string }[]; finished: boolean };
export function choose(graph: CausalGraph, session: CausalSession, choiceId: string): CausalSession;
export function compareChoices(graph: CausalGraph, session: CausalSession, leftId: string, rightId: string): { structurallyDifferent: boolean; differentStateKeys: string[]; left: CausalSession; right: CausalSession; limitation: string };
export function causalTrace(session: CausalSession): { sequence: number; cause: string; from: string; to: string; observedFact: string; stateChanges: Record<string, RecordedEffect> }[];
