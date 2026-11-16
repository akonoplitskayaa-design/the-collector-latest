import { findBanalLanguage, findExplanatoryLanguage } from './quality.ts';
import { readPerson, type PersonReading } from './chart.ts';
import { readDesire, type DesireReading } from './desire.ts';
import { seatBeat, seatEnding } from './seat.ts';

/**
 * Copy of the Director. Nothing here is imported by the app, the Edge Function, or Supabase.
 * The procedure is the canon in AGENTS.md: desire, hook, choice, consequence, reversal,
 * blind spot, one sign, then real life. No model is called.
 */

export type ChartTheme = 'price' | 'appetite' | 'time' | 'agency' | 'release' | 'visibility' | 'reciprocity';

export type ChartFact = {
  source: string;
  precision: 'computed' | 'approximate' | 'unknown';
  theme: ChartTheme;
};

export type NameRecord = {
  text: string;
  /** Supplied by a lexicon. This copy never invents an etymology. */
  etymology?: { languages: string[]; meanings: string[] } | null;
};

export type PrivateIntake = {
  name: NameRecord;
  desire: string;
  birth: { date: string; time: string | null; place: string | null };
  /** Fixed clock for tests. Absent means the actual current time. */
  referenceInstant?: string;
  chart?: ChartFact[];
};

type Phase = 'hook' | 'almost' | 'appetite' | 'price' | 'time' | 'reversal' | 'ordeal';
type Direction = 'space' | 'reach' | 'sight';

type HypothesisId = 'unforced' | 'summoned' | 'form-without-will';

type Evidence = {
  id: string;
  choiceId: string;
  direction: Direction;
  supports: HypothesisId;
  challenges: HypothesisId;
};

type World = {
  other: 'outside' | 'in-aisle' | 'one-step' | 'at-door' | 'seated';
  seat: 'empty' | 'held-open' | 'taken' | 'coat';
  ticket: 'none' | 'on-seat' | 'pushed' | 'covered' | 'in-hand';
  glass: 'none' | 'untouched' | 'shared' | 'taken';
  light: 'red' | 'bone' | 'gold' | 'black';
  clock: 'quiet' | 'late-print' | 'already-warm';
  watcher: 'player' | 'other';
  grasshopper: boolean;
  form: 'open' | 'hardened' | 'loosened';
  reversal: boolean;
  lure: 'sudden' | 'limit' | 'taste' | 'ahead';
  last: 'none' | 'space' | 'reach' | 'sight';
  first: 'none' | 'space' | 'reach' | 'sight';
  tasted: boolean;
  second: boolean;
  path: string;
};

export type PublicChoice = { id: string; label: string };

export type PublicFrame = {
  lines: string[];
  choices: PublicChoice[];
  imagePrompt: string;
};

export type PublicSign = {
  object: string;
  color: string;
  material: string;
  character: string;
  instruction: string;
  imagePrompt: string;
};

export type PublicView =
  | { kind: 'safety'; lines: string[] }
  | { kind: 'frame'; frame: PublicFrame }
  | { kind: 'sign'; revelation: string[]; sign: PublicSign; returnPrompt: 'WHAT HAPPENED?' };

type Trace = { object: string; color: string; material: string; character: string };

type ChoiceDef = {
  id: string;
  label: string;
  direction: Direction;
  supports: HypothesisId;
  challenges: HypothesisId;
  trace: Trace;
  apply: (world: World) => World;
};

type PrivateState = {
  intake: PrivateIntake;
  person: PersonReading;
  reading: DesireReading;
  resolvedChart: ChartFact[];
  stopped: boolean;
  phaseOrder: Phase[];
  cursor: number;
  world: World;
  evidence: Evidence[];
  offer: ChoiceDef[];
  traces: Trace[];
  safety: boolean;
};

export type Session = { privateState: PrivateState };

const SAFETY = /(?:\b(?:kill myself|suicide|self-harm|hurt myself)\b|суицид|убить себя|порезать себя)/iu;

function tokens(value: string): string[] {
  return [...new Set(value.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 4))];
}

function domainObject(desire: string, chart: ChartFact[]): 'ticket' | 'glass' | 'seat' {
  const first = chart.find((fact) => fact.precision !== 'unknown');
  if (first?.theme === 'price' || first?.theme === 'time') return 'ticket';
  if (first?.theme === 'appetite' || /(?:деньг|money|wealth|дом|home)/iu.test(desire)) return 'glass';
  return 'seat';
}

function phaseOrder(second: boolean): Phase[] {
  return second
    ? ['hook', 'almost', 'appetite', 'price']
    : ['hook', 'almost', 'appetite', 'price', 'time', 'reversal', 'ordeal'];
}

function shownPressure(intake: PrivateIntake, person: PersonReading): World['lure'] {
  const supplied = intake.chart?.[0]?.theme;
  if (supplied === 'price') return 'limit';
  if (supplied === 'appetite') return 'taste';
  if (supplied === 'time') return 'ahead';
  if (supplied === 'visibility' || supplied === 'agency' || supplied === 'reciprocity') return 'sudden';
  if (person.pressure === 'nearness') return 'taste';
  if (person.pressure === 'ahead') return 'ahead';
  if (person.pressure === 'sudden') return 'sudden';
  return 'limit';
}

function initialWorld(object: 'ticket' | 'glass' | 'seat', lure: World['lure'], second: boolean): World {
  return {
    other: lure === 'sudden' || second ? 'in-aisle' : 'outside',
    seat: 'empty',
    ticket: object === 'ticket' ? 'on-seat' : 'none',
    glass: object === 'glass' ? 'untouched' : 'none',
    light: 'red',
    clock: 'quiet',
    watcher: 'player',
    grasshopper: false,
    form: 'open',
    reversal: false,
    lure,
    last: 'none',
    first: 'none',
    tasted: false,
    second,
    path: '',
  };
}

function clone(world: World): World {
  return { ...world };
}

function choice(def: ChoiceDef): ChoiceDef {
  return def;
}

function mark(world: World, last: World['last'], extra: Partial<World> = {}): World {
  const path = world.path ? `${world.path}/${last}` : String(last);
  return { ...clone(world), ...extra, last, path, first: world.first === 'none' ? last : world.first };
}

function offerFor(phase: Phase, world: World, object: 'ticket' | 'glass' | 'seat'): ChoiceDef[] {
  if (world.second) {
    return seatBeat(world.path, world.lure).choices.map((item) => choice({
      id: `${world.path || 'open'}-${item.direction}`,
      label: item.label,
      direction: item.direction,
      supports: item.direction === 'space' ? 'unforced' : item.direction === 'reach' ? 'summoned' : 'form-without-will',
      challenges: item.direction === 'space' ? 'summoned' : 'unforced',
      trace: { object: 'SEAT', color: item.direction === 'reach' ? 'DEEP RED' : 'BONE', material: 'VELVET', character: item.direction === 'space' ? 'STILL' : 'HELD' },
      apply: (current) => mark(current, item.direction, { reversal: current.path.split('/').length >= 2 }),
    }));
  }
  const focus = object === 'ticket' ? 'TICKET' : object === 'glass' ? 'GLASS' : 'SEAT';
  const paper = object === 'ticket' ? 'PAPER' : object === 'glass' ? 'GLASS' : 'VELVET';
  if (phase === 'hook') {
    return [
      choice({
        id: 'hook-space',
        label: 'Clear the seat beside you.',
        direction: 'space',
        supports: 'unforced',
        challenges: 'summoned',
        trace: { object: focus, color: 'BONE', material: paper, character: 'STILL' },
        apply: (current) => mark(current, 'space', { seat: 'held-open', other: 'one-step', light: 'bone', form: 'loosened', grasshopper: true }),
      }),
      choice({
        id: 'hook-reach',
        label: 'Offer him your hand.',
        direction: 'reach',
        supports: 'summoned',
        challenges: 'unforced',
        trace: { object: focus, color: 'DEEP RED', material: paper, character: 'HELD' },
        apply: (current) => mark(current, 'reach', {
          seat: 'taken',
          ticket: current.ticket === 'on-seat' ? 'in-hand' : current.ticket,
          glass: current.glass === 'untouched' ? 'taken' : current.glass,
          other: 'seated',
          light: 'red',
          form: 'hardened',
        }),
      }),
      choice({
        id: 'hook-sight',
        label: 'Stand, and ask him to leave with you.',
        direction: 'sight',
        supports: 'form-without-will',
        challenges: 'summoned',
        trace: { object: 'SCREEN', color: 'BLACK', material: 'LIGHT', character: 'AHEAD' },
        apply: (current) => mark(current, 'sight', { watcher: 'other', light: 'black', clock: 'late-print' }),
      }),
    ];
  }
  if (phase === 'almost') {
    return [
      choice({
        id: 'almost-space',
        label: world.last === 'reach' ? 'Keep his hand, and let the lights find you.' : 'Let him sit. Do not speak yet.',
        direction: 'space',
        supports: 'unforced',
        challenges: 'summoned',
        trace: { object: 'BERRY', color: 'DEEP RED', material: 'SKIN', character: 'CRUSHED' },
        apply: (current) => mark(current, 'space', { form: 'loosened', seat: 'held-open' }),
      }),
      choice({
        id: 'almost-reach',
        label: world.last === 'sight' ? 'Take the last step outside with him.' : world.last === 'reach' ? 'Let go before the lights finish rising.' : 'Turn toward him now that he is seated.',
        direction: 'reach',
        supports: 'summoned',
        challenges: 'unforced',
        trace: { object: 'DOOR', color: 'BONE', material: 'WOOD', character: 'OPEN' },
        apply: (current) => mark(current, 'reach', { other: 'at-door', form: 'hardened' }),
      }),
      choice({
        id: 'almost-sight',
        label: 'Look at the screen, where this has not happened yet.',
        direction: 'sight',
        supports: 'form-without-will',
        challenges: 'summoned',
        trace: { object: 'SCREEN', color: 'GOLD', material: 'LIGHT', character: 'LATE' },
        apply: (current) => mark(current, 'sight', { clock: 'late-print', watcher: 'other' }),
      }),
    ];
  }
  if (phase === 'appetite') {
    return [
      choice({
        id: 'appetite-space',
        label: 'Leave the fruit shining. Do not take what it is offering.',
        direction: 'space',
        supports: 'unforced',
        challenges: 'summoned',
        trace: { object: world.glass === 'none' ? 'FIG' : 'GLASS', color: 'BONE', material: world.glass === 'none' ? 'SUGAR' : 'GLASS', character: 'UNBROKEN' },
        apply: (current) => mark(current, 'space', { glass: current.glass === 'none' ? 'untouched' : 'shared', form: 'loosened', grasshopper: true }),
      }),
      choice({
        id: 'appetite-reach',
        label: 'Taste it. For a few seconds, nothing in you asks for proof.',
        direction: 'reach',
        supports: 'summoned',
        challenges: 'unforced',
        trace: { object: world.glass === 'none' ? 'FIG' : 'GLASS', color: 'DEEP RED', material: world.glass === 'none' ? 'SUGAR' : 'GLASS', character: 'WARM' },
        apply: (current) => mark(current, 'reach', { glass: 'taken', tasted: true, form: 'hardened', light: 'red' }),
      }),
    ];
  }
  if (phase === 'price') {
    return [
      choice({
        id: 'price-space',
        label: world.tasted ? 'Stay in the warmth, with nothing left to check.' : 'Let the fruit shine, and do not eat.',
        direction: 'space',
        supports: 'unforced',
        challenges: 'form-without-will',
        trace: { object: 'SEAT', color: 'BONE', material: 'VELVET', character: 'OPEN' },
        apply: (current) => mark(current, 'space', { seat: 'held-open', form: 'open' }),
      }),
      choice({
        id: 'price-reach',
        label: world.tasted ? 'Search the aisle for the tray.' : 'Take the fruit now. The tray leaves with the first bite.',
        direction: 'reach',
        supports: 'form-without-will',
        challenges: 'unforced',
        trace: { object: 'TICKET', color: 'ANTIQUE GOLD', material: 'PAPER', character: 'TORN' },
        apply: (current) => mark(current, 'reach', { seat: 'taken', ticket: 'covered', tasted: true, form: 'hardened' }),
      }),
    ];
  }
  if (phase === 'time') {
    return [
      choice({
        id: 'time-space',
        label: world.first === 'reach'
          ? 'Leave the hand where it is. The supper was already sure.'
          : world.first === 'sight'
            ? 'Stay in the row. The screen had already loosened.'
            : 'Leave the centimeters. The berry was already crushed.',
        direction: 'space',
        supports: 'unforced',
        challenges: 'summoned',
        trace: { object: 'SEAT', color: 'GOLD', material: 'VELVET', character: 'WARM' },
        apply: (current) => mark(current, 'space', { clock: 'already-warm', seat: 'held-open', form: 'loosened' }),
      }),
      choice({
        id: 'time-reach',
        label: 'Touch the fingers anyway.',
        direction: 'reach',
        supports: 'summoned',
        challenges: 'unforced',
        trace: { object: 'SEAT', color: 'DEEP RED', material: 'VELVET', character: 'WARM' },
        apply: (current) => mark(current, 'reach', { clock: 'late-print', seat: 'taken', form: 'hardened' }),
      }),
      choice({
        id: 'time-sight',
        label: 'Walk into the screen and loosen your hand first, on purpose.',
        direction: 'sight',
        supports: 'form-without-will',
        challenges: 'summoned',
        trace: { object: 'SCREEN', color: 'BLACK', material: 'LIGHT', character: 'LOOSE' },
        apply: (current) => mark(current, 'sight', { clock: 'late-print', watcher: 'player', form: 'loosened' }),
      }),
    ];
  }
  if (phase === 'reversal') {
    return [
      choice({
        id: 'reversal-space',
        label: 'Stay, and let yourself be kept.',
        direction: 'space',
        supports: 'unforced',
        challenges: 'summoned',
        trace: { object: 'ROW', color: 'GOLD', material: 'LIGHT', character: 'SEEN' },
        apply: (current) => mark(current, 'space', { watcher: 'other', reversal: true, other: 'seated', form: 'loosened' }),
      }),
      choice({
        id: 'reversal-reach',
        label: 'Turn, and be the one who holds.',
        direction: 'reach',
        supports: 'summoned',
        challenges: 'unforced',
        trace: { object: 'AISLE', color: 'DEEP RED', material: 'LIGHT', character: 'TURNED' },
        apply: (current) => mark(current, 'reach', { watcher: 'player', reversal: true, other: 'at-door', form: 'hardened' }),
      }),
    ];
  }
  return [
    choice({
      id: 'ordeal-space',
      label: 'Set your hand on the empty place and do not close it.',
      direction: 'space',
      supports: 'form-without-will',
      challenges: 'summoned',
      trace: { object: 'ROW', color: 'BONE', material: 'VELVET', character: 'OPEN' },
      apply: (current) => mark(current, 'space', { reversal: true, seat: 'held-open', form: 'open' }),
    }),
    choice({
      id: 'ordeal-reach',
      label: 'Stand, and let the row keep him.',
      direction: 'reach',
      supports: 'summoned',
      challenges: 'unforced',
      trace: { object: 'DOOR', color: 'BLACK', material: 'WOOD', character: 'LEFT' },
      apply: (current) => mark(current, 'reach', { reversal: true, other: 'at-door', form: 'hardened' }),
    }),
  ];
}

function linesFor(phase: Phase, world: World): string[] {
  if (world.second) return seatBeat(world.path, world.lure).lines;
  if (phase === 'hook') {
    if (!world.second) {
      return [
        'The shop is closed. One warm coin is on the counter, and the hand that left it is gone.',
        'Outside the window, a table is being paid for without anyone counting.',
        'The coin would open the drawer. The drawer is not the evening in the street.',
      ];
    }
    if (world.lure === 'sudden') {
      return [
        'The row was empty. A voice you know asks if the seat is free.',
        'He is standing in the aisle. He hoped you would still be here. He has not sat down.',
      ];
    }
    if (world.lure === 'ahead') {
      return [
        'The film is ending. On the screen he is already in the aisle. Then he is actually there.',
        'He asks if the seat is free. He hoped you would still be here. He has not sat down.',
      ];
    }
    if (world.lure === 'taste') {
      return [
        'The film is ending. The warmth of him reaches you before he speaks.',
        'He asks if the seat is free. He came because he hoped you would still be here. He has not sat down.',
      ];
    }
    return [
      'The film is ending. The row is almost empty, and you are still in your seat.',
      'A voice you know asks if the seat beside you is free. He hoped you would still be here.',
      'He does not sit. A few centimeters of aisle remain between you.',
    ];
  }
  if (phase === 'almost') {
    if (world.last === 'sight') {
      return [
        'You stand. The aisle is short, and the doors are already in his face.',
        'He walks half a step behind you. The film stays in the row you left.',
        'Outside, he still has not taken the last step. The invitation is not finished.',
      ];
    }
    if (world.last === 'reach') {
      return [
        'He takes your hand. The credits are still moving, and he sits without letting go.',
        'The house lights find the two of you still joined.',
        'From the last row, one laugh, as if this were the ending the film had missed.',
      ];
    }
    return [
      'You move your coat. The seat is clear. He sits, and he does not touch you.',
      'The screen goes dark. What remains between you is the width of the armrest.',
      'He is the one who closed the distance, and only by sitting.',
    ];
  }
  if (phase === 'appetite') {
    return world.second
      ? [
        'A man sets one ripe fruit on the armrest, between the two hands.',
        'Forever is what people ask for, he says. Then they ask for proof every twenty minutes.',
        'The fruit is close enough to smell. He waits.',
      ]
      : [
        'The evening outside is the fruit. The coin on the counter is the proof.',
        'You can smell a kitchen through the open door.',
        'Taking the coin would settle the drawer and lose the street.',
      ];
  }
  if (phase === 'price') {
    return world.tasted
      ? [
        'The taste is exact. Then the tray is lifted away.',
        'What goes with it is the habit of checking whether the warmth is real.',
        'The hand can stay. The proof cannot.',
      ]
      : [
        'The fruit stays on the armrest, bright, uneaten.',
        'He does not lift the tray. He waits, and the waiting is the offer.',
        'Nothing has been paid. The sweetness is still possible.',
      ];
  }
  if (phase === 'time') {
    const hidden = world.first === 'reach'
      ? 'The supper was already sure of the parting, before the hand closed.'
      : world.first === 'sight'
        ? 'Your fingers on the screen had already opened, before you stood.'
        : 'The berry was already crushed, though he had not turned.';
    return [
      'You are in the first seat again. The screen is off. His hand is on the armrest.',
      hidden,
      'You can act again, knowing that.',
    ];
  }
  if (phase === 'reversal') {
    return [
      'The grip changes sides.',
      'A hand is on your wrist. You are the one being kept, and he will not look away.',
      'He is waiting now the way you were waiting.',
    ];
  }
  return [
    'You reach for his fingers. They are not warmer. You wait. He does not lean in. The screen does not wake.',
    'What worked in the first seat has stopped working here.',
    'One act is left, and it is not a repeat of those three.',
  ];
}

function imageFor(world: World): string {
  return `Old cinema, one row, ${world.light} light, ${world.seat} neighboring seat, no readable text, no face.`;
}

function ready(state: PrivateState): boolean {
  if (state.world.second) return state.evidence.length >= 4 && state.cursor >= 4;
  return state.evidence.length >= 7
    && state.world.reversal
    && state.cursor >= state.phaseOrder.length;
}

function contradict(state: PrivateState): boolean {
  const directions = new Set(state.evidence.map((item) => item.direction));
  return state.evidence.length >= 4 && (!directions.has('space') || !directions.has('reach') || !state.world.reversal);
}

function signFrom(state: PrivateState): PublicSign {
  const trace = state.traces.at(-1)!;
  return {
    object: trace.object,
    color: trace.color,
    material: trace.material,
    character: trace.character,
    instruction: state.world.form === 'loosened' ? 'IF IT APPEARS, FOLLOW IT.' : 'TODAY, PAY ATTENTION.',
    imagePrompt: `One ${trace.character.toLowerCase()} ${trace.color.toLowerCase()} ${trace.material.toLowerCase()} ${trace.object.toLowerCase()} on black, no letters.`,
  };
}

function revelation(state: PrivateState): string[] {
  if (state.world.second) return seatEnding(state.world.path);
  const lived = state.world.first === 'reach'
    ? 'You closed the distance, and the supper decided the parting for you.'
    : state.world.first === 'sight'
      ? 'You walked to the screen, and your fingers opened first.'
      : 'You cleared the seat, and he sat without touching you.';
  return [
    'You still treat nearness as something that must announce its route in advance.',
    lived,
    state.world.tasted ? 'You took the certainty, and the proof left with the tray.' : 'You left the fruit shining, and the doubt stayed beside it.',
    'What remains is the seat, and whether you will know it if it happens.',
  ];
}

function privateReasons(state: PrivateState): string {
  const etymology = state.intake.name.etymology?.meanings?.length
    ? 'A supplied name meaning was used only as private weight.'
    : 'No etymology was supplied, so none was invented.';
  const supplied = state.intake.chart?.map((fact) => fact.source).join(', ');
  return [
    etymology,
    `Birth instant ${state.person.instant}. Time ${state.person.precision.time}. Place ${state.person.precision.place}. Angles ${state.person.precision.angles}.`,
    `Mahadasha ${state.person.mahadasha ?? 'unavailable'}. Antardasha ${state.person.antardasha ?? 'unavailable'}.`,
    state.person.tightestTransit ? `Tightest transit on the reference day: ${state.person.tightestTransit}.` : 'No transit within three degrees on the reference day.',
    supplied ? `Supplied counterpoint: ${supplied}.` : 'No supplied counterpoint. The computed chart drives the film.',
    `Natal figures: ${state.person.natalFigures.join('; ') || 'none'}. Pressure ${state.person.pressure}.`,
    `Desire structure: ${state.reading.summary}.`,
    `Evidence: ${state.evidence.map((item) => item.id).join(', ') || 'none'}.`,
  ].join(' ');
}

export function conclusions(session: Session): string[] {
  const { person, reading } = session.privateState;
  const lines: string[] = [];
  if (reading.unforcedMovement) lines.push('He has to move by himself. If the scene makes you pull him, the wish has already failed.');
  else if (reading.possession) lines.push('The wish hardens around something that can be held. Holding it may cost the freedom it was for.');
  else if (reading.otherPerson) lines.push('Another figure is inside the wish. The scene cannot happen alone.');
  else lines.push('No second figure is required. What happens can stay between you and one thing.');
  const sky = person.natalFigures.join(' | ');
  if (/Venus square Saturn|Saturn square Venus|Venus opposition Saturn/.test(sky)) {
    lines.push('What draws you is the moment before contact, not the contact itself.');
  } else if (person.pressure === 'sudden') {
    lines.push('The room can contain someone who was not in it when you sat down.');
  } else if (person.pressure === 'ahead') {
    lines.push('You can be shown the later moment before you have acted.');
  } else if (person.pressure === 'nearness') {
    lines.push('Nearness is already happening, before anyone decides.');
  }
  if (/Mars conjunction Jupiter|Jupiter conjunction Mars/.test(sky)) {
    lines.push('A private gesture is too small. The scene has to become larger than the two of you.');
  }
  if (/Moon square Venus|Moon opposition Saturn|Moon square Saturn|Venus square Moon/.test(sky)) {
    lines.push('A large feeling will not hold you unless it is exact.');
  }
  if (person.mahadasha === 'Rahu' || person.mahadasha === 'Ketu') {
    lines.push(person.precision.time === 'resolved'
      ? 'Something in the period has turned. This uses the time you gave. If that time was only approximate, this one stays unproven.'
      : 'The period cannot be asserted. The time is not exact enough.');
  }
  if (lines.length < 2) lines.push('The sky did not yield a tight figure. The film will not invent one.');
  return lines.slice(0, 5);
}

export function privateLogic(session: Session): string {
  return privateReasons(session.privateState);
}

function assertPublicSafe(intake: PrivateIntake, person: PersonReading, text: string): void {
  const banned = [
    ...tokens(intake.desire),
    ...tokens(intake.name.text),
    ...tokens((intake.name.etymology?.meanings ?? []).join(' ')),
    ...tokens([...(intake.chart ?? []), ...person.facts].map((fact) => fact.source).join(' ')),
    ...tokens(`${person.mahadasha ?? ''} ${person.antardasha ?? ''} ${person.tightestTransit ?? ''}`),
  ];
  const haystack = text.toLocaleLowerCase();
  const hit = banned.find((token) => haystack.includes(token));
  if (hit) throw new Error(`AssignmentLeak:${hit}`);
  if (findBanalLanguage(text).length || findExplanatoryLanguage(text).length) throw new Error('AssignmentLanguage');
  if (/\bcollector\b|коллектор/iu.test(text)) throw new Error('AssignmentCollectorNamed');
}

export function openFilm(intake: PrivateIntake): Session {
  const person = readPerson(intake);
  const reading = readDesire(intake.desire);
  const resolvedChart = intake.chart?.length ? intake.chart : person.facts;
  const object = domainObject(intake.desire, resolvedChart);
  const safety = SAFETY.test(intake.desire);
  const state: PrivateState = {
    intake,
    person,
    reading,
    resolvedChart,
    stopped: false,
    phaseOrder: phaseOrder(reading.otherPerson || reading.unforcedMovement),
    cursor: 0,
    world: initialWorld(object, shownPressure(intake, person), reading.otherPerson || reading.unforcedMovement),
    evidence: [],
    offer: [],
    traces: [],
    safety,
  };
  if (!safety) {
    const phase = state.phaseOrder[0]!;
    state.offer = offerFor(phase, state.world, object);
    state.cursor = 1;
  }
  const session = { privateState: state };
  if (!safety) assertPublicSafe(intake, person, JSON.stringify(publicView(session)));
  return session;
}

export function choose(session: Session, choiceId: string): Session {
  const current = session.privateState;
  if (current.safety || current.stopped) throw new Error('AssignmentNoChoice');
  const selected = current.offer.find((item) => item.id === choiceId);
  if (!selected) throw new Error('AssignmentUnknownChoice');
  const world = selected.apply(current.world);
  const evidence: Evidence = {
    id: `e${current.evidence.length + 1}`,
    choiceId,
    direction: selected.direction,
    supports: selected.supports,
    challenges: selected.challenges,
  };
  const next: PrivateState = {
    ...current,
    world,
    evidence: [...current.evidence, evidence],
    traces: [...current.traces, selected.trace],
    offer: [],
  };
  const finished = ready(next) || (next.evidence.length >= 8);
  if (!finished) {
    let phase = next.phaseOrder[Math.min(next.cursor, next.phaseOrder.length - 1)]!;
    if (contradict(next) && next.cursor >= next.phaseOrder.length) phase = next.world.reversal ? 'contradiction' : 'reversal';
    next.offer = offerFor(phase, world, domainObject(next.intake.desire, next.resolvedChart));
    next.cursor += 1;
  } else {
    next.stopped = true;
  }
  const sessionNext = { privateState: next };
  assertPublicSafe(next.intake, next.person, JSON.stringify(publicView(sessionNext)));
  return sessionNext;
}

function bannedTokens(state: PrivateState): string[] {
  return [
    ...tokens(state.intake.desire),
    ...tokens(state.intake.name.text),
    ...tokens((state.intake.name.etymology?.meanings ?? []).join(' ')),
    ...tokens([...(state.intake.chart ?? []), ...state.person.facts].map((fact) => fact.source).join(' ')),
    ...tokens(`${state.person.mahadasha ?? ''} ${state.person.antardasha ?? ''} ${state.person.tightestTransit ?? ''}`),
  ];
}

function scrub(state: PrivateState, text: string): string {
  let next = text;
  for (const token of bannedTokens(state)) {
    next = next.replace(new RegExp(`(?<![\\p{L}\\p{N}])${token}(?![\\p{L}\\p{N}])`, 'giu'), '');
  }
  return next.replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}

export function publicView(session: Session): PublicView {
  const state = session.privateState;
  if (state.safety) {
    return { kind: 'safety', lines: ['This stops here.', 'If you are in danger, contact local emergency help or someone you trust.'] };
  }
  if (state.stopped) {
    return { kind: 'sign', revelation: revelation(state).map((line) => scrub(state, line)).filter(Boolean), sign: signFrom(state), returnPrompt: 'WHAT HAPPENED?' };
  }
  const phase = state.phaseOrder[Math.max(0, state.cursor - 1)] ?? 'hook';
  const lines = linesFor(phase, state.world).map((line) => scrub(state, line)).filter(Boolean);
  return {
    kind: 'frame',
    frame: {
      lines: lines.length >= 2 ? lines.slice(0, 4) : ['The house is dark.', 'The row is still here.'],
      choices: state.offer.map((item) => ({ id: item.id, label: scrub(state, item.label) || item.label })),
      imagePrompt: scrub(state, imageFor(state.world)),
    },
  };
}

export function play(intake: PrivateIntake, picks: Direction[]): Session {
  let session = openFilm(intake);
  for (const pick of picks) {
    const view = publicView(session);
    if (view.kind !== 'frame') break;
    const choice = session.privateState.offer.find((item) => item.direction === pick);
    if (!choice) break;
    session = choose(session, choice.id);
  }
  return session;
}

export function answerReturn(session: Session, report: string): { used: boolean } {
  const text = report.trim();
  if (!text || !session.privateState.stopped) return { used: false };
  return { used: true };
}
