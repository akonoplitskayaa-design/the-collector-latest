/** Dependency-free causal branching core. Offline, deterministic, model-independent. MIT. */
export class NarrativeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'NarrativeError';
    this.code = code;
  }
}
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const filled = (value) => typeof value === 'string' && value.trim().length > 0;
const allowedValue = (v) => v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v));

/** Inspect invalid edges, duplicate choices, effects, and unreachable scenes. */
export function inspectGraph(graph) {
  const errors = [];
  const warnings = [];
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const ids = new Set();
  if (!record(graph) || nodes.length === 0) errors.push('A graph needs a nonempty nodes array.');
  for (const node of nodes) {
    if (!record(node) || !filled(node.id)) { errors.push('Every node needs a nonempty id.'); continue; }
    if (ids.has(node.id)) errors.push('Duplicate node id: ' + node.id);
    ids.add(node.id);
  }
  if (!filled(graph?.start) || !ids.has(graph.start)) errors.push('The start node is missing.');
  for (const node of nodes) {
    if (!record(node) || !filled(node.id)) continue;
    if (!Array.isArray(node.lines) || node.lines.length === 0 || node.lines.some((line) => !filled(line))) errors.push('Node ' + node.id + ' needs nonempty lines.');
    if (!Array.isArray(node.choices)) { errors.push('Node ' + node.id + ' must have a choices array.'); continue; }
    const choiceIds = new Set();
    const outcomes = new Set();
    for (const choice of node.choices) {
      if (!record(choice) || !filled(choice.id) || !filled(choice.label)) { errors.push('Invalid choice in ' + node.id); continue; }
      if (choiceIds.has(choice.id)) errors.push('Duplicate choice id ' + choice.id + ' in ' + node.id);
      choiceIds.add(choice.id);
      if (!filled(choice.next) || !ids.has(choice.next)) errors.push('Choice ' + choice.id + ' has an unknown next node.');
      if (!filled(choice.fact)) errors.push('Choice ' + choice.id + ' needs a recorded consequence.');
      if (!record(choice.effects) || Object.entries(choice.effects).some(([key, value]) => !filled(key) || !allowedValue(value))) {
        errors.push('Choice ' + choice.id + ' needs plain scalar effects.');
        continue;
      }
      const signature = JSON.stringify([choice.next, Object.entries(choice.effects).sort(([a], [b]) => a.localeCompare(b))]);
      if (outcomes.has(signature)) warnings.push('Choices in ' + node.id + ' have identical structural next states.');
      outcomes.add(signature);
    }
  }
  const byId = new Map(nodes.filter((node) => record(node) && filled(node.id)).map((node) => [node.id, node]));
  const reachable = new Set();
  function visit(id) {
    if (reachable.has(id) || !byId.has(id)) return;
    reachable.add(id);
    for (const choice of byId.get(id).choices ?? []) if (filled(choice?.next)) visit(choice.next);
  }
  if (byId.has(graph?.start)) visit(graph.start);
  for (const id of ids) if (!reachable.has(id)) warnings.push('Unreachable node: ' + id);
  if (reachable.size && ![...reachable].some((id) => byId.get(id).choices?.length === 0)) warnings.push('No reachable ending node.');
  return { valid: errors.length === 0, errors, warnings, reachableNodes: [...reachable] };
}
function assertGraph(graph) {
  const inspection = inspectGraph(graph);
  if (!inspection.valid) throw new NarrativeError('INVALID_GRAPH', inspection.errors.join(' '));
}
/** Create a session. No external service or model call. */
export function startSession(graph, sessionId = 'offline-session') {
  assertGraph(graph);
  if (!filled(sessionId)) throw new NarrativeError('INVALID_SESSION', 'A session id is required.');
  return { sessionId, currentNode: graph.start, world: {}, evidence: [] };
}
function currentNode(graph, session) {
  if (!record(session) || !filled(session.currentNode) || !Array.isArray(session.evidence) || !record(session.world)) {
    throw new NarrativeError('INVALID_SESSION', 'Session state is invalid.');
  }
  const node = graph.nodes.find((item) => item.id === session.currentNode);
  if (!node) throw new NarrativeError('INVALID_SESSION', 'Unknown current node.');
  return node;
}
/** Expose only the current scene and visible choice labels, hiding future results. */
export function publicScene(graph, session) {
  const node = currentNode(graph, session);
  return { id: node.id, lines: [...node.lines], choices: node.choices.map(({ id, label }) => ({ id, label })), finished: node.choices.length === 0 };
}
/** Record a legal choice with before-and-after scalar effects. Returns fresh state. */
export function choose(graph, session, choiceId) {
  assertGraph(graph);
  const node = currentNode(graph, session);
  const choice = node.choices.find((item) => item.id === choiceId);
  if (!choice) throw new NarrativeError('INVALID_CHOICE', 'Choice is unavailable in the current scene.');
  const effectChanges = Object.fromEntries(Object.entries(choice.effects).map(([key, after]) => [key, {
    before: Object.hasOwn(session.world, key) ? session.world[key] : null,
    after,
  }]));
  const event = { sequence: session.evidence.length + 1, from: node.id, choiceId, to: choice.next, fact: choice.fact, effectChanges };
  return { sessionId: session.sessionId, currentNode: choice.next, world: { ...session.world, ...choice.effects }, evidence: [...session.evidence, event] };
}
/** Compare alternative consequences without mutating the original session. */
export function compareChoices(graph, session, leftId, rightId) {
  if (leftId === rightId) throw new NarrativeError('SAME_CHOICE', 'Compare two different choices.');
  const left = choose(graph, session, leftId);
  const right = choose(graph, session, rightId);
  const changedKeys = [...new Set([...Object.keys(left.world), ...Object.keys(right.world)])].filter((key) => left.world[key] !== right.world[key]);
  return {
    structurallyDifferent: left.currentNode !== right.currentNode || changedKeys.length > 0,
    differentStateKeys: changedKeys, left, right,
    limitation: 'Structural divergence does not establish literary originality, emotional force or meaningful personalization.',
  };
}
/** Inspect a reproducible sequence of recorded events, without psychological assumptions. */
export function causalTrace(session) {
  if (!Array.isArray(session?.evidence)) throw new NarrativeError('INVALID_SESSION', 'Evidence is missing.');
  return session.evidence.map((event) => ({
    sequence: event.sequence, cause: event.choiceId, from: event.from, to: event.to,
    observedFact: event.fact, stateChanges: structuredClone(event.effectChanges),
  }));
}
