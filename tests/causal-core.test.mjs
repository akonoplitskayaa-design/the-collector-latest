import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectGraph, startSession, publicScene, choose, compareChoices, causalTrace, NarrativeError } from '../src/causal/index.mjs';

const graph = {
  start: 'door',
  nodes: [
    { id: 'door', lines: ['The bell rings twice. A letter lies under the door.'], choices: [
      { id: 'open', label: 'Open the letter', next: 'opened', fact: 'The wax seal is broken.', effects: { seal: 'broken', trust: 1 } },
      { id: 'leave', label: 'Leave it closed', next: 'closed', fact: 'The seal stays intact.', effects: { seal: 'intact', trust: 0 } },
    ] },
    { id: 'opened', lines: ['The letter contains a map with your handwriting.'], choices: [] },
    { id: 'closed', lines: ['Footsteps recede before you can ask who came.'], choices: [] },
  ],
};

test('validates graph topology with one reachable ending on each branch', () => {
  const result = inspectGraph(graph);
  assert.equal(result.valid, true);
  assert.equal(result.reachableNodes.length, 3);
  assert.deepEqual(result.warnings, []);
});
test('records a causal transition and hides future outcomes', () => {
  const initial = startSession(graph, 'fixture-1');
  const frame = publicScene(graph, initial);
  assert.equal(JSON.stringify(frame).includes('seal'), false);
  assert.deepEqual(frame.choices, [{ id: 'open', label: 'Open the letter' }, { id: 'leave', label: 'Leave it closed' }]);
  const result = choose(graph, initial, 'open');
  assert.equal(initial.currentNode, 'door');
  assert.deepEqual(initial.evidence, []);
  assert.equal(result.currentNode, 'opened');
  assert.equal(result.world.seal, 'broken');
  assert.equal(result.evidence[0].effectChanges.seal.before, null);
  assert.equal(result.evidence[0].effectChanges.seal.after, 'broken');
  assert.equal(publicScene(graph, result).finished, true);
  assert.equal(causalTrace(result)[0].observedFact, 'The wax seal is broken.');
});
test('counterfactual alternatives produce different world states', () => {
  const session = startSession(graph);
  const compared = compareChoices(graph, session, 'open', 'leave');
  assert.equal(compared.structurallyDifferent, true);
  assert.ok(compared.differentStateKeys.includes('seal'));
  assert.equal(compared.left.world.seal, 'broken');
  assert.equal(compared.right.world.seal, 'intact');
  assert.deepEqual(session.world, {});
});
test('unrelated metadata cannot change choice outcomes', () => {
  const withMetadata = { ...graph, authorNote: 'irrelevant' };
  assert.deepEqual(choose(withMetadata, startSession(withMetadata), 'open'), choose(graph, startSession(graph), 'open'));
});
test('rejects unknown graph targets and reports equivalent branches', () => {
  const bad = structuredClone(graph);
  bad.nodes[0].choices[0].next = 'missing';
  assert.equal(inspectGraph(bad).valid, false);
  assert.throws(() => startSession(bad), (error) => error instanceof NarrativeError && error.code === 'INVALID_GRAPH');
  const redundant = structuredClone(graph);
  redundant.nodes[0].choices[1].next = 'opened';
  redundant.nodes[0].choices[1].effects = { trust: 1, seal: 'broken' };
  assert.ok(inspectGraph(redundant).warnings.some((warning) => warning.includes('identical structural')));
});
test('unavailable choices do not alter the existing state', () => {
  const session = startSession(graph);
  assert.throws(() => choose(graph, session, 'secret'), (error) => error.code === 'INVALID_CHOICE');
  assert.deepEqual(session.evidence, []);
});
