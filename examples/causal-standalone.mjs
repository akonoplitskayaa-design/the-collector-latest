/** Offline synthetic branching example: no live AI calls or sensitive input. */
import { inspectGraph, startSession, publicScene, compareChoices, choose, causalTrace } from '../src/causal/index.mjs';

const story = {
  start: 'entrance',
  nodes: [
    { id: 'entrance', lines: ['Someone leaves a key on the table. The door is still open.'], choices: [
      { id: 'keep', label: 'Keep the key', next: 'held', fact: 'The key remains with you.', effects: { key: 'held', door: 'open' } },
      { id: 'return', label: 'Return the key', next: 'returned', fact: 'The other person takes the key.', effects: { key: 'returned', door: 'closed' } },
    ] },
    { id: 'held', lines: ['The empty doorway waits while the key warms in your palm.'], choices: [] },
    { id: 'returned', lines: ['The other person closes the door gently from outside.'], choices: [] },
  ],
};
const report = inspectGraph(story);
if (!report.valid || report.warnings.length) throw new Error(JSON.stringify(report));
const initial = startSession(story, 'synthetic-test');
const before = publicScene(story, initial);
const difference = compareChoices(story, initial, 'keep', 'return');
if (!difference.structurallyDifferent) throw new Error('Expected branch divergence was not observed.');
const chosen = choose(story, initial, 'return');
console.log(JSON.stringify({
  demo: 'Standalone causal branching example; deterministic and offline',
  opening: before,
  comparison: { structurallyDifferent: difference.structurallyDifferent, differentStateKeys: difference.differentStateKeys },
  chosenEnding: publicScene(story, chosen),
  causalTrace: causalTrace(chosen),
  caveat: difference.limitation,
}, null, 2));
