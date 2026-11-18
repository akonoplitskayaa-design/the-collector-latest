/**
 * First integration step: reuse Caelus and a small licensed historical corpus.
 * Experimental research module. The current screen and Director are untouched.
 *
 * Historical delineations are source material for later editorial synthesis.
 * They are not personal conclusions or predictions.
 */
import {
  interpretationContext,
  interpret,
  reconcile,
  type Chart,
  type ContextOptions,
  type ReadingEntry,
} from 'caelus';
import {
  publicDomainPassages,
  publicDomainSources,
} from 'caelus-delineations-pd/pd';

export type FoundationTradition = 'jyotish' | 'western-historical';

type HistoricalProvenance = {
  author: string;
  work: string;
  locus: string;
  tradition: string;
  rights: 'pd-us' | 'cc0';
};

type HistoricalEntry = ReadingEntry & {
  provenance: HistoricalProvenance;
  editorialStatus: 'original-historical-text-needs-review';
};

const CORPUS_SELECTION: Record<FoundationTradition, { sourceId: string; rulePrefix: string }> = {
  jyotish: {
    sourceId: 'varahamihira-brihat-jataka',
    rulePrefix: 'brihat-nakshatras:',
  },
  'western-historical': {
    sourceId: 'heindel-message-of-the-stars',
    rulePrefix: 'heindel-aspects:',
  },
};

const passageById = new Map(publicDomainPassages.map((passage) => [passage.id, passage]));

function sourcesFor(tradition: FoundationTradition) {
  const selected = CORPUS_SELECTION[tradition];
  const source = publicDomainSources.find((item) => item.id === selected.sourceId);
  if (!source) throw new Error(`Missing corpus source ${selected.sourceId}`);
  const rules = source.rules.filter((rule) => rule.id.startsWith(selected.rulePrefix));
  if (rules.length === 0) throw new Error(`No rules for ${tradition}`);
  for (const rule of rules) {
    const passage = passageById.get(rule.id);
    if (!passage || (passage.rights !== 'pd-us' && passage.rights !== 'cc0')) {
      throw new Error(`Missing public-domain provenance for ${rule.id}`);
    }
  }
  return [{ ...source, rules }];
}

/** Inspect which existing literary keys are available before adding book-derived rules. */
export function foundationInventory(tradition: FoundationTradition) {
  return sourcesFor(tradition).flatMap((source) =>
    source.rules.map((rule) => {
      const passage = passageById.get(rule.id)!;
      return {
        id: rule.id,
        sourceId: source.id,
        kind: passage.when.kind,
        source: passage.source,
        rights: passage.rights,
        tradition: passage.tradition,
      };
    }),
  );
}

/**
 * Evaluate Caelus's own computed Chart against our initial historical keys.
 * We deliberately reject mixing tropical western and sidereal Jyotish sources.
 * Caelus chart construction and ephemeris data loading remain separate.
 */
export function readCaelusFoundation(
  chart: Chart,
  tradition: FoundationTradition,
  contextOptions: ContextOptions = {},
): {
  zodiac: string;
  factIds: string[];
  entries: HistoricalEntry[];
  groupCount: number;
  contestedGroupCount: number;
} {
  const context = interpretationContext(chart, contextOptions);
  if (tradition === 'jyotish' && !context.zodiac.startsWith('sidereal:')) {
    throw new Error('Jyotish reading requires a Caelus sidereal chart with explicit ayanamsa');
  }
  if (tradition === 'western-historical' && context.zodiac !== 'tropical') {
    throw new Error('Western historical reading requires a tropical chart');
  }
  const reading = interpret(context, sourcesFor(tradition));
  const groups = reconcile(reading, { dedupe: true });
  const entries = reading.entries.map((entry): HistoricalEntry => {
    const passage = passageById.get(entry.rule);
    if (!passage || (passage.rights !== 'pd-us' && passage.rights !== 'cc0')) {
      throw new Error(`Unverified passage ${entry.rule}`);
    }
    return {
      ...entry,
      provenance: {
        author: passage.source.author,
        work: passage.source.work,
        locus: passage.source.locus,
        tradition: passage.tradition,
        rights: passage.rights,
      },
      editorialStatus: 'original-historical-text-needs-review',
    };
  });
  return {
    zodiac: context.zodiac,
    factIds: context.atoms.map((atom) => atom.id),
    entries,
    groupCount: groups.length,
    contestedGroupCount: groups.filter((group) => group.contested).length,
  };
}
