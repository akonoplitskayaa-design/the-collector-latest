import assert from 'node:assert/strict';
import test from 'node:test';

import { emptyEvaluationModel } from '../../lab/realEvaluationFixtures.ts';
import { prepareKernelDirection } from '../../supabase/functions/director/kernelDirection.ts';
import { acceptNatalSynthesis, reusableNatalSynthesis, type NatalPersonalSynthesis, type NatalSynthesisWire } from '../../supabase/functions/director/natalSynthesis.ts';
import { buildPersonalSources, type SourceRegistry } from '../../supabase/functions/director/synthesis.ts';
import { kernelMaterialFixture } from '../helpers/kernelMaterial.ts';

/**
 * Adversarial checks for the 16 Nov 2026 NatalPersonalSynthesis.
 * Production files are not modified. These fixtures are contract attacks, not astrological readings.
 * A failure means the live contract accepts a personally-shaped but logically weak chain.
 */

function matrix(options: { mars?: number; mercury?: number; moonJupiter?: boolean; period?: boolean; name?: string; desire?: string } = {}) {
  return {
    identity: options.name ? { name: options.name, birthDate: '1990-01-02', birthTime: 'UNKNOWN', birthPlace: 'Private fixture place' } : undefined,
    privateOriginalDesire: options.desire ?? 'A private fictional wish about an unfinished encounter.',
    symbolicMatrix: {
      precision: { overall: 'computed', capabilities: { exactBirthInstant: false } },
      calculation: { utcAnchor: '2000-01-01T12:00:00Z' },
      westernTropical: {
        positions: [
          { body: 'Mars', tropicalLongitude: options.mars ?? 10 },
          { body: 'Mercury', tropicalLongitude: options.mercury ?? 20 },
        ],
        aspects: [
          { bodies: ['Mars', 'Moon'], aspect: 'square', orb: 1 },
          ...(options.moonJupiter ? [{ bodies: ['Moon', 'Jupiter'], aspect: 'trine', orb: 0.8 }] : []),
        ],
      },
      currentPeriods: {
        gameTimestamp: '2026-11-16T08:00:00Z',
        currentPositions: options.period === false ? [] : [{ body: 'Saturn', tropicalLongitude: 90 }],
      },
    },
  };
}

async function sources(options?: Parameters<typeof matrix>[0], model = emptyEvaluationModel()) {
  const { identity, ...rest } = matrix(options);
  return buildPersonalSources({ ...(identity ? { identity } : {}), ...rest, hiddenModel: model });
}

function find(registry: SourceRegistry, origin: string) {
  const index = registry.sources.findIndex((source) => source.origin.startsWith(origin));
  assert.notEqual(index, -1, origin);
  return index;
}

function proposal(registry: SourceRegistry, patch: { claim?: string; mechanism?: NatalSynthesisWire['decision']['mechanism']; primary?: number } = {}): NatalSynthesisWire {
  const mars = find(registry, 'natal.tropical.position.Mars');
  const square = find(registry, 'natal.tropical.aspect');
  const period = registry.sources.findIndex((source) => source.origin.startsWith('current.position.Saturn'));
  const mercury = find(registry, 'natal.tropical.position.Mercury');
  return {
    interpretations: [0, 1, 2].map((index) => ({
      claim: index === 0 && patch.claim ? patch.claim : `A distinct provisional interpretation ${index} of the supplied factors.`,
      natalSlots: [mars, square],
      jointReasoning: 'A comparison of two supplied factors, not a measured trait.',
      desireRelevance: 'This contrast is relevant only to the supplied private condition.',
      withoutSourceCondition: 'Absent the disputed condition a different opportunity would remain.',
      tradition: 'Declared symbolic Western interpretation; fixture only.',
      periodSlots: period >= 0 ? [period] : [],
      periodEffect: 'An uncertain symbolic activation, never an observed event.',
      alternative: 'The act may instead be a response to its physical cost.',
      supportObservation: 'Repeat the act under a changed relevant condition.',
      refuteObservation: 'Choose the contrary opportunity when the same condition persists.',
      uncertainty: 'No psychological fact is established by this fixture.',
    })),
    decision: {
      primary: patch.primary ?? 0,
      alternative: patch.primary === 1 ? 0 : 1,
      whyNow: 'Contrast the two accounts under a changed opportunity.',
      dimension: 'projection-participation',
      mechanism: patch.mechanism ?? 'OPEN_EXPERIMENT',
      emotionalStake: 'An unfinished encounter remains possible.',
      experiment: 'Vary access while keeping both participants free.',
      discriminatingActions: ['Approach the offered position.', 'Keep the shared space available.'],
      incompatibleConsequences: ['The encounter continues from the aisle.', 'The encounter remains within the row.'],
    },
    excluded: [{ sourceSlots: [mercury], reason: 'This fixture explicitly excludes this factor from its selected contrast.' }],
    behavioralReview: [],
  };
}

function sceneKey(synthesis: NatalPersonalSynthesis) {
  return {
    mechanism: synthesis.decision.mechanism,
    dimension: synthesis.decision.dimension,
    primary: synthesis.decision.primary,
    alternative: synthesis.decision.alternative,
    experiment: synthesis.decision.experiment,
    actions: synthesis.decision.discriminatingActions,
    consequences: synthesis.decision.incompatibleConsequences,
  };
}

function sceneActions(synthesis: NatalPersonalSynthesis, registry: SourceRegistry) {
  const prepared = prepareKernelDirection({ hiddenModel: emptyEvaluationModel(), natalPersonalSynthesis: synthesis }, registry, kernelMaterialFixture());
  assert.equal(prepared.status, 'planned');
  return prepared.plan!.actions.map((action) => action.action);
}

test('1. a cited aspect correlation is not accepted as a cause of the person', async () => {
  const registry = await sources();
  const input = proposal(registry, { claim: 'The Mars square causes this person to fear refusal.' });
  assert.throws(() => acceptNatalSynthesis(input, registry), { name: 'NatalSynthesis_UnsupportedCausalClaim' });
});

test('2. one cited aspect cannot omit a contrary aspect that is also calculated', async () => {
  const registry = await sources({ moonJupiter: true });
  const trine = find(registry, 'natal.tropical.aspect.["Moon","Jupiter"].trine');
  const input = proposal(registry);
  assert.equal(input.interpretations.some((item) => item.natalSlots.includes(trine)), false);
  assert.equal(input.excluded.some((item) => item.sourceSlots.includes(trine)), false);
  assert.throws(() => acceptNatalSynthesis(input, registry), { name: 'NatalSynthesis_ContraryIndicatorOmitted' });
});

test('3. paired charts that differ only in an excluded factor cannot receive different decisions', async () => {
  const cited = await sources({ mercury: 20 });
  const other = await sources({ mercury: 30 });
  const prior = acceptNatalSynthesis(proposal(cited), cited);
  assert.equal(reusableNatalSynthesis(prior, other), true);
  const moved = proposal(other, { mechanism: 'APPETITE' });
  assert.throws(() => acceptNatalSynthesis(moved, other, prior), { name: 'NatalSynthesis_IrrelevantChartChangedDecision' });
});

test('4. paired charts with a different cited natal fact cannot keep the same directing decision', async () => {
  const near = await sources({ mars: 10 });
  const far = await sources({ mars: 180 });
  const prior = acceptNatalSynthesis(proposal(near), near);
  assert.equal(reusableNatalSynthesis(prior, far), false);
  const same = proposal(far);
  assert.throws(() => acceptNatalSynthesis(same, far, prior), { name: 'NatalSynthesis_RelevantChartKeptDecision' });
});

test('5. removing the relevant cited period changes the directing decision', async () => {
  const withPeriod = await sources({ period: true });
  const withoutPeriod = await sources({ period: false });
  const left = acceptNatalSynthesis(proposal(withPeriod), withPeriod);
  const right = acceptNatalSynthesis(proposal(withoutPeriod), withoutPeriod);
  assert.equal(left.interpretations[0]!.periodRefs.length > 0, true);
  assert.equal(right.interpretations[0]!.periodRefs.length, 0);
  assert.notDeepEqual(sceneKey(left), sceneKey(right));
});

test('6. changing only the unused name does not change reuse or the directing decision', async () => {
  const anna = await sources({ name: 'Anna' });
  const mara = await sources({ name: 'Mara' });
  const prior = acceptNatalSynthesis(proposal(anna), anna);
  assert.notEqual(anna.sources.find((source) => source.origin === 'intake.name')?.value, mara.sources.find((source) => source.origin === 'intake.name')?.value);
  assert.equal(reusableNatalSynthesis(prior, mara), true);
  assert.throws(() => acceptNatalSynthesis(proposal(mara, { mechanism: 'APPETITE' }), mara, prior), { name: 'NatalSynthesis_IrrelevantCounterfactualChangedDecision' });
});

test('7. the wish cannot license a natal claim the cited calculation does not contain', async () => {
  const registry = await sources({ desire: 'The wish is that he returns of his own accord.' });
  const input = proposal(registry, { claim: 'The natal square means he returns of his own accord.' });
  assert.throws(() => acceptNatalSynthesis(input, registry), { name: 'NatalSynthesis_DesireSelectedReading' });
});

test('8. a correct natal source ref does not make an unrelated conclusion supported', async () => {
  const registry = await sources();
  const input = proposal(registry, { claim: 'This person abandons every lasting bond.' });
  const accepted = acceptNatalSynthesis(input, registry);
  const mars = registry.sources[find(registry, 'natal.tropical.position.Mars')]!;
  assert.equal(accepted.interpretations[0]!.natalRefs.some((ref) => ref.id === mars.ref.id), true);
  assert.throws(() => acceptNatalSynthesis(input, registry), { name: 'NatalSynthesis_ClaimNotEntailedBySources' });
});

test('9. an action that contradicts a reading cannot leave that reading and its claim in place', async () => {
  const model = emptyEvaluationModel();
  model.evidenceLedger = [{
    id: 'actual-choice-1', source: 'physical-choice', physicalAction: 'Step back from the available position',
    dimension: 'participation', sceneId: 'scene-1', chapter: 1, sequence: 0,
  } as typeof model.evidenceLedger[number]];
  const registry = await sources(undefined, model);
  const prior = acceptNatalSynthesis(proposal(await sources()), await sources());
  const wire = proposal(registry);
  const evidence = find(registry, 'observation.');
  wire.behavioralReview = [0, 1, 2].map((interpretationSlot) => ({
    interpretationSlot, evidenceSlot: evidence, effect: 'challenges' as const,
    reason: 'The observed movement opposes the anticipated approach.',
    confound: 'The position itself may have been unappealing.',
    nextUncertainty: 'Would approach change if that physical cost changed?',
  }));
  const next = acceptNatalSynthesis(wire, registry, prior);
  assert.equal(next.interpretations[0]!.claim, prior.interpretations[0]!.claim);
  assert.equal(next.decision.primary, 0);
  assert.throws(() => acceptNatalSynthesis(wire, registry, prior), { name: 'NatalSynthesis_ContradictedReadingStillSelected' });
});

test('10. new evidence that only rewords the review must also change the scene decision', async () => {
  const before = await sources();
  const first = acceptNatalSynthesis(proposal(before), before);
  const model = emptyEvaluationModel();
  model.evidenceLedger = [{
    id: 'actual-choice-1', source: 'physical-choice', physicalAction: 'Remain within the row',
    dimension: 'participation', sceneId: 'scene-1', chapter: 1, sequence: 0,
  } as typeof model.evidenceLedger[number]];
  const after = await sources(undefined, model);
  const wire = proposal(after);
  const evidence = find(after, 'observation.');
  wire.behavioralReview = [0, 1, 2].map((interpretationSlot) => ({
    interpretationSlot, evidenceSlot: evidence, effect: 'inconclusive' as const,
    reason: 'The recorded act is now described differently.',
    confound: 'The physical position also changed its opportunity.',
    nextUncertainty: 'The earlier wording no longer fits this recorded act.',
  }));
  const second = acceptNatalSynthesis(wire, after, first);
  assert.notEqual(first.behavioralReview.length, second.behavioralReview.length);
  assert.deepEqual(sceneKey(first), sceneKey(second));
  assert.notDeepEqual(sceneActions(first, before), sceneActions(second, before));
});
