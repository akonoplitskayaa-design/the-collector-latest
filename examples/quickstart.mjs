/**
 * Public offline demonstration of the earlier deterministic Director prototype.
 * Uses illustrative synthetic intake data and makes no live API calls.
 * This is not the private Codex engine or a finished interactive application.
 */
import { openMind, chooseMind, internalTrace } from '../src/lib/director/mind.ts';

const session = openMind({
  name: 'Example',
  desire: 'I want someone to come back of their own will.',
  birth: { date: '2000-01-01', time: null, place: null },
  referenceInstant: '2026-11-18T05:00:00Z',
});

const scene = session.scene;
if (!scene || scene.choices.length === 0) throw new Error('Demo has no first scene.');

console.log('THE COLLECTOR public research demo');
console.log('This is an offline, deterministic example with synthetic data.');
console.log('\nOpening:');
for (const line of scene.lines) console.log(line);
console.log('\nChoices:');
for (const [index, choice] of scene.choices.entries()) console.log(`${index + 1}. ${choice.label}`);

const after = chooseMind(session, scene.choices[0].id);
console.log('\nSelected action:', scene.choices[0].label);
console.log('Observed consequence:', after.evidence.at(-1)?.publicFact);
console.log('Hypothesis weights:', after.hypotheses.map(({ id, weight }) => `${id}=${weight}`).join(', '));
console.log('Trace length:', internalTrace(after).length);
console.log('Next scene lines:', after.scene?.lines.length ?? 0);
