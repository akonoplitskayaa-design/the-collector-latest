import { readPerson, type PersonReading } from './chart.ts';
import { readDesire, type DesireReading } from './desire.ts';
import { PRINCIPLES, type Principle } from './principles.ts';

export type MindIntake = {
  name: string;
  desire: string;
  birth: { date: string; time: string | null; place: string | null };
  referenceInstant?: string;
};

type Hypothesis = {
  id: string;
  claim: string;
  weight: number;
  basis: string[];
};

type Evidence = {
  id: string;
  choiceId: string;
  supports: string;
  challenges: string;
  publicFact: string;
};

export type TraceStep = {
  natal: string[];
  synthesis: string;
  hypothesis: string;
  rival: string;
  principle: string;
  decision: string;
  scene: string[];
  choices: string[];
};

type Choice = { id: string; label: string; supports: string; challenges: string; fact: string };

export type MindSession = {
  intake: MindIntake;
  person: PersonReading;
  desire: DesireReading;
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  usedPrinciples: string[];
  lastFact: string;
  turn: number;
  done: boolean;
  trace: TraceStep[];
  scene: { lines: string[]; choices: Choice[] } | null;
  finale: { lines: string[]; signs: { object: string; color: string; material: string; character: string; because: string }[] } | null;
};

const PERIOD: Record<string, string> = {
  Ketu: 'Что-то уже отпущено, хотя рука ещё здесь.',
  Venus: 'Сладость близко, и её можно не брать.',
  Sun: 'На тебя смотрят, даже когда экран погашен.',
  Moon: 'Чувство держится только если деталь точна.',
  Mars: 'Жест хочет стать больше этой комнаты.',
  Rahu: 'В проходе уже кто-то, кого минуту назад не было.',
  Jupiter: 'Событие на полшага впереди тела.',
  Saturn: 'Пауза длиннее жеста. В ней и есть предложение.',
  Mercury: 'Фраза ещё не сказана. Её можно такой и оставить.',
};

function tokens(value: string): string[] {
  return [...new Set(value.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 4))];
}

function scrub(intake: MindIntake, person: PersonReading, text: string): string {
  const banned = [
    ...tokens(intake.desire),
    ...tokens(intake.name),
    ...tokens(`${person.mahadasha ?? ''} ${person.antardasha ?? ''} ${person.nakshatra}`),
    'saturn', 'venus', 'jupiter', 'mercury', 'rahu', 'ketu', 'махадаша',
  ];
  let next = text;
  for (const token of banned) {
    next = next.replace(new RegExp(`(?<![\\p{L}\\p{N}])${token}(?![\\p{L}\\p{N}])`, 'giu'), '');
  }
  return next.replace(/\s{2,}/g, ' ').trim();
}

function hypothesesFor(person: PersonReading, desire: DesireReading): Hypothesis[] {
  const cited = person.natalFigures[0] ?? 'no tight natal aspect';
  const list: Hypothesis[] = [];
  if (desire.unforcedMovement) {
    list.push({ id: 'unforced', claim: 'He has to move without being pulled.', weight: 1, basis: [desire.summary] });
    list.push({ id: 'summoned', claim: 'The wish is to make him move.', weight: 1, basis: [desire.summary] });
  } else if (desire.possession) {
    list.push({ id: 'hold', claim: 'The wish is to keep the object.', weight: 1, basis: [desire.summary] });
    list.push({ id: 'enter', claim: 'The wish is to enter the evening the object only points at.', weight: 1, basis: [desire.summary] });
  } else {
    list.push({ id: 'presence', claim: 'The wish wants a situation, not an explanation.', weight: 1, basis: [desire.summary] });
    list.push({ id: 'proof', claim: 'The wish wants certainty before the situation.', weight: 1, basis: [desire.summary] });
  }
  if (person.pressure === 'limit') list.push({ id: 'threshold', claim: `The draw is the moment before contact. Basis: ${cited}.`, weight: 1, basis: [cited] });
  if (person.pressure === 'sudden') list.push({ id: 'arrival', claim: `The draw is an uninvited appearance. Basis: ${cited}.`, weight: 1, basis: [person.mahadasha ?? cited] });
  if (person.pressure === 'nearness' || person.pressure === 'ahead') list.push({ id: 'scale', claim: `A private gesture is too small here. Basis: ${cited}.`, weight: 1, basis: [cited] });
  return list;
}

function selectPrinciple(session: Pick<MindSession, 'person' | 'desire' | 'turn' | 'usedPrinciples' | 'hypotheses'>): Principle {
  const desire = session.desire.possession ? 'money' : session.desire.otherPerson || session.desire.unforcedMovement ? 'return' : 'other';
  const wanted = (['threshold', 'appetite', 'time', 'price', 'reversal', 'ordeal'] as const)[session.turn];
  const ranked = PRINCIPLES.map((principle) => {
    let score = 0;
    if (principle.when.pressure && principle.when.pressure === session.person.pressure) score += 4;
    if (principle.when.desire && principle.when.desire === desire) score += 3;
    if (principle.when.turn === session.turn) score += 10;
    if (wanted && principle.event === wanted) score += 12;
    if (session.turn > 0 && principle.when.turn === undefined) score -= 6;
    if (principle.when.turn !== undefined && principle.when.turn !== session.turn) score -= 20;
    if (session.usedPrinciples.includes(principle.id)) score -= 8;
    return { principle, score };
  }).sort((left, right) => right.score - left.score || left.principle.id.localeCompare(right.principle.id));
  return ranked[0]!.principle;
}

function activePair(list: Hypothesis[]): [Hypothesis, Hypothesis] {
  const sorted = [...list].sort((left, right) => left.weight - right.weight || left.id.localeCompare(right.id));
  return [sorted[0]!, sorted[1] ?? sorted[0]!];
}

function figureLine(person: PersonReading): string {
  const figure = person.natalFigures[0] ?? '';
  if (figure.includes('Venus') && figure.includes('Saturn')) return 'Последние сантиметры сокращать нельзя. Их должен пройти он.';
  if (figure.includes('Mars') && figure.includes('Jupiter')) return 'Жест на двоих тонет. Зал слишком велик для него.';
  if (figure.includes('Moon')) return 'Если деталь неточна, большое чувство не держится.';
  return 'Тесной фигуры, которая меняла бы комнату, нет. Сцена не подставляет чужую.';
}

function opening(person: PersonReading, desire: DesireReading): string[] {
  const fromChart = figureLine(person);
  const season = PERIOD[person.antardasha ?? ''] ?? '';
  if (desire.possession) {
    return [
      'Лавка закрыта. На прилавке одна тёплая монета. Руки, которая её оставила, уже нет.',
      'За окном стол оплачен, и никто не считает.',
      person.pressure === 'limit' ? 'Между монетой и дверью несколько сантиметров, и их нельзя перепрыгнуть мыслью.' : 'Монета открыла бы ящик. Ящик — это не вечер на улице.',
      fromChart,
      season,
    ];
  }
  if (person.pressure === 'sudden') {
    return [
      'Ряд был пуст. Теперь в проходе стоит тот, кого ты знаешь раньше, чем оборачиваешься.',
      'Он спрашивает, свободно ли место. Он ещё не сел.',
      fromChart,
      season,
    ];
  }
  if (person.pressure === 'nearness' || person.pressure === 'ahead') {
    return [
      'Фильм заканчивается, и зал ещё полон. Он стоит у твоего ряда и спрашивает, свободно ли место.',
      'Жест на двоих здесь слишком тих. Смеются все.',
      'Он не садится.',
      fromChart,
      season,
    ];
  }
  return [
    'Фильм заканчивается. Ряд почти пуст, и ты всё ещё в своём кресле.',
    'Знакомый голос спрашивает, свободно ли место рядом. Он надеялся, что ты ещё здесь. Он не садится.',
    fromChart,
    season,
  ];
}

function openingChoices(desire: DesireReading): Choice[] {
  if (desire.possession) {
    return [
      { id: 'leave-coin', label: 'Оставить монету и выйти к столу.', supports: 'enter', challenges: 'hold', fact: 'Монета остаётся на прилавке. Ты выходишь к столу.' },
      { id: 'take-coin', label: 'Взять монету.', supports: 'hold', challenges: 'enter', fact: 'Монета у тебя. Улица остаётся за стеклом.' },
    ];
  }
  return [
    { id: 'clear-seat', label: 'Освободить место рядом.', supports: 'unforced', challenges: 'summoned', fact: 'Ты убираешь пальто. Он садится сам и не касается тебя.' },
    { id: 'offer-hand', label: 'Протянуть ему руку.', supports: 'summoned', challenges: 'unforced', fact: 'Он берёт руку и садится, не отпуская.' },
    { id: 'stand-up', label: 'Встать и предложить выйти вместе.', supports: 'arrival', challenges: 'unforced', fact: 'Ты встаёшь. Он идёт на полшага сзади и не выходит.' },
  ];
}

function returnBeat(session: MindSession): { lines: string[]; choices: Choice[] } {
  const first = session.evidence[0]?.choiceId;
  const second = session.evidence[1]?.choiceId;
  const third = session.evidence[2]?.choiceId;
  const season = PERIOD[session.person.antardasha ?? ''] ?? '';
  if (session.turn === 1) {
    const situation = first === 'offer-hand'
      ? 'В другой руке у него спелый плод. Он его не протягивает: пока держит тебя, плод просто ждёт.'
      : first === 'stand-up'
        ? 'У двери лежит надрезанный плод. Вы смотрите на него, и выход перестаёт быть единственным направлением.'
        : 'На подлокотнике между креслами лежит спелый плод. Он на него не смотрит.';
    return {
      lines: [session.lastFact, situation],
      choices: [
        { id: 'leave-fruit', label: 'Не прикасаться к плоду.', supports: 'threshold', challenges: 'summoned', fact: 'Плод остаётся ярким. Его не берут.' },
        { id: 'taste-fruit', label: 'Взять плод. На эти секунды некого проверять.', supports: 'unforced', challenges: 'proof', fact: 'Вкус точный. Поднос уносят, и с ним уходит проверка.' },
      ],
    };
  }
  if (session.turn === 2) {
    return {
      lines: [
        second === 'taste-fruit' ? 'Вкус уже случился. Проверять в этом кадре нечего.' : 'Плод так и лежит целым.',
        'Экран идёт назад, к двенадцати секундам до вопроса. Сделанное остаётся с вами.',
        season,
      ].filter(Boolean),
      choices: [
        { id: 'speak-then', label: 'Сказать в ту минуту: «Я здесь».', supports: 'unforced', challenges: 'summoned', fact: 'Голос звучит в уже снятом кадре. Он оборачивается и к пустому месту, и к тебе.' },
        { id: 'wind-on', label: 'Молчать и докрутить ещё двенадцать секунд.', supports: 'threshold', challenges: 'arrival', fact: 'Ещё двенадцать секунд: он уходил и вернулся за плодом. Повод оказался маленьким.' },
      ],
    };
  }
  if (session.turn === 3) {
    const spoke = third === 'speak-then';
    return {
      lines: spoke
        ? ['Голос остаётся в старом кадре. Забрать его — сделать вид, что минуты не было. Оставить — и прошлое уже не только его.']
        : ['Маленький повод уже виден. Можно оставить чудо меньше, чем казалось, или снова закрыть склейку.'],
      choices: spoke
        ? [
          { id: 'leave-voice', label: 'Оставить голос в том кадре.', supports: 'unforced', challenges: 'proof', fact: 'Голос остаётся в прошлом кадре. Ты его не забираешь.' },
          { id: 'rewind-over', label: 'Перемотать вперёд и закрыть минуту.', supports: 'proof', challenges: 'unforced', fact: 'Минута закрыта. Голос из неё стёрт.' },
        ]
        : [
          { id: 'leave-seam', label: 'Оставить маленький повод на виду.', supports: 'threshold', challenges: 'proof', fact: 'Склейка открыта. Повод остаётся маленьким и видимым.' },
          { id: 'hide-seam', label: 'Закрыть склейку и вернуть прежнюю версию.', supports: 'proof', challenges: 'threshold', fact: 'Склейка закрыта. Возвышенная версия снова на экране.' },
        ],
    };
  }
  if (session.turn === 4) {
    const held = first === 'offer-hand' ? 'Он всё ещё держит ту руку, которую ты протянула первой.' : first === 'stand-up' ? 'Вы так и стоите не у выхода.' : 'Он сидит в том кресле, которое ты освободила, и не касается тебя.';
    return {
      lines: [session.lastFact, held, 'Теперь его ладонь на твоём запястье. Он ждёт так, как ждал ты.'],
      choices: [
        { id: 'be-kept', label: 'Оставить запястье в его руке.', supports: 'unforced', challenges: 'summoned', fact: 'Ты остаёшься. Удерживают тебя.' },
        { id: 'keep-him', label: 'Снять его руку и взять его за запястье.', supports: 'summoned', challenges: 'unforced', fact: 'Ты удерживаешь его. Роли не меняются.' },
      ],
    };
  }
  const failed = first === 'offer-hand'
    ? 'Ты снова протягиваешь руку. Она уже занята. Жест ничего не начинает.'
    : first === 'stand-up'
      ? 'Ты снова встаёшь. Дверь не ближе. Жест ничего не кончает.'
      : 'Ты снова убираешь пальто. Кресло уже занято им. Жест ничего не открывает.';
  return {
    lines: [failed, 'Экран тёмный. Повторение не зажигает его.'],
    choices: [
      { id: 'open-hand', label: 'Положить свободную руку на колено и не звать.', supports: 'threshold', challenges: 'summoned', fact: 'Свободная рука лежит на колене и никого не зовёт.' },
      { id: 'copy', label: 'Повторить жест ещё раз.', supports: 'proof', challenges: 'threshold', fact: 'Жест повторён. Экран не загорается и во второй раз.' },
    ],
  };
}

function moneyBeat(session: MindSession): { lines: string[]; choices: Choice[] } {
  const took = session.evidence[0]?.choiceId === 'take-coin';
  const season = PERIOD[session.person.antardasha ?? ''] ?? '';
  if (session.turn === 1) {
    return {
      lines: took
        ? ['Монета у тебя, и сесть за стол с ней нельзя: вечер не продаётся второй раз.']
        : ['Ты у стола. Монета осталась за стеклом и больше не решает, сядешь ли ты.'],
      choices: [
        { id: 'sit-anyway', label: 'Сесть, не показывая, чем заплачено.', supports: 'enter', challenges: 'hold', fact: 'Ты садишься. Чем оплачен стол, отсюда не видно.' },
        { id: 'stay-out', label: 'Остаться стоять у стекла.', supports: 'hold', challenges: 'enter', fact: 'Ты остаёшься у стекла. Стол идёт без тебя.' },
      ],
    };
  }
  if (session.turn === 2) {
    return {
      lines: ['Счёт приносят не тебе. На нём чужое имя, и бумага тёплая.', season].filter(Boolean),
      choices: [
        { id: 'read-name', label: 'Прочитать имя и не трогать бумагу.', supports: 'enter', challenges: 'hold', fact: 'Имя прочитано. Бумага остаётся на столе.' },
        { id: 'cover-bill', label: 'Накрыть счёт ладонью.', supports: 'hold', challenges: 'enter', fact: 'Счёт закрыт ладонью. Имя под ней.' },
      ],
    };
  }
  if (session.turn === 3) {
    return {
      lines: ['Официант ставит один стакан между тобой и пустым стулом. Второй не ставит.'],
      choices: [
        { id: 'push-glass', label: 'Пододвинуть стакан к пустому стулу.', supports: 'enter', challenges: 'hold', fact: 'Стакан стоит у пустого стула.' },
        { id: 'drink', label: 'Выпить самой.', supports: 'hold', challenges: 'enter', fact: 'Стакан пуст. Второй так и не принесли.' },
      ],
    };
  }
  if (session.turn === 4) {
    return {
      lines: ['Стул напротив отодвигают. Садится не тот, кого можно было купить этим вечером.'],
      choices: [
        { id: 'stay-seated', label: 'Остаться сидеть.', supports: 'enter', challenges: 'hold', fact: 'Ты остаёшься. Чужой стул занят не покупкой.' },
        { id: 'stand-bill', label: 'Встать и забрать счёт с собой.', supports: 'hold', challenges: 'enter', fact: 'Счёт у тебя. Стол остаётся без тебя.' },
      ],
    };
  }
  return {
    lines: ['Повторить первую покупку нельзя: касса уже закрыта. Остаётся стол или улица.'],
    choices: [
      { id: 'leave-table', label: 'Выйти, не оглядываясь на прилавок.', supports: 'enter', challenges: 'hold', fact: 'Ты выходишь. Прилавок остаётся за спиной.' },
      { id: 'back-counter', label: 'Вернуться к прилавку.', supports: 'hold', challenges: 'enter', fact: 'Ты у прилавка. Касса закрыта, монеты больше нет.' },
    ],
  };
}

function signsFor(session: MindSession) {
  const supported = [...session.hypotheses].sort((left, right) => right.weight - left.weight)[0]!;
  const principle = session.usedPrinciples[1] ?? session.usedPrinciples[0] ?? 'none';
  const period = session.person.antardasha ?? 'unknown period';
  return [
    { object: 'КРЕСЛО', color: 'КОСТЯНОЙ', material: 'БАРХАТ', character: supported.id === 'summoned' ? 'СЖАТОЕ' : 'СВОБОДНОЕ', because: `The supported hypothesis is ${supported.claim}` },
    { object: 'ПЛОД', color: 'ТЁМНО-КРАСНЫЙ', material: 'КОЖУРА', character: session.evidence.some((item) => item.choiceId === 'taste-fruit') ? 'НАДКУШЕННЫЙ' : 'ЦЕЛЫЙ', because: `Appetite was governed by ${principle}.` },
    { object: 'ПАУЗА', color: 'ЧЁРНЫЙ', material: 'ТИШИНА', character: 'ТОЧНАЯ', because: `The inner period is ${period}, cited as a season, not as a verdict.` },
  ];
}

function compose(session: MindSession): MindSession {
  const principle = selectPrinciple(session);
  const pair = activePair(session.hypotheses);
  const beat = session.turn === 0
    ? { lines: opening(session.person, session.desire), choices: openingChoices(session.desire) }
    : session.desire.possession ? moneyBeat(session) : returnBeat(session);
  const lines = beat.lines.map((line) => scrub(session.intake, session.person, line)).filter(Boolean);
  const choices = beat.choices;
  const step: TraceStep = {
    natal: [
      session.person.natalFigures[0] ?? 'no figure within six degrees',
      `dasha ${session.person.mahadasha ?? 'unavailable'} / ${session.person.antardasha ?? 'unavailable'}`,
      `nakshatra ${session.person.nakshatra} pada ${session.person.nakshatraPada}`,
      session.person.houses ? `houses computed, ascendant ${session.person.ascendant}` : 'houses unavailable because time or place is not exact',
      session.person.retrograde.length ? `retrograde ${session.person.retrograde.join(', ')}` : 'no retrograde among the five',
    ],
    synthesis: `${session.desire.summary}. Pressure ${session.person.pressure}. Cited: ${session.person.natalFigures[0] ?? 'none'}. ${pair[0].claim}`,
    hypothesis: `${pair[0].id}: ${pair[0].claim}`,
    rival: `${pair[1].id}: ${pair[1].claim}`,
    principle: `${principle.id} (${principle.source})`,
    decision: principle.law,
    scene: lines,
    choices: choices.map((choice) => choice.label),
  };
  return { ...session, scene: { lines, choices }, usedPrinciples: [...session.usedPrinciples, principle.id], trace: [...session.trace, step] };
}

export function openMind(intake: MindIntake): MindSession {
  const person = readPerson({ birth: intake.birth, referenceInstant: intake.referenceInstant });
  const desire = readDesire(intake.desire);
  const session: MindSession = {
    intake, person, desire,
    hypotheses: hypothesesFor(person, desire),
    evidence: [],
    usedPrinciples: [],
    lastFact: '',
    turn: 0,
    done: false,
    trace: [],
    scene: null,
    finale: null,
  };
  return compose(session);
}

export function chooseMind(session: MindSession, choiceId: string): MindSession {
  if (!session.scene || session.done) throw new Error('No open scene.');
  const selected = session.scene.choices.find((choice) => choice.id === choiceId);
  if (!selected) throw new Error('That act is not in this scene.');
  const hypotheses = session.hypotheses.map((item) => {
    if (item.id === selected.supports) return { ...item, weight: item.weight + 1 };
    if (item.id === selected.challenges) return { ...item, weight: item.weight - 1 };
    return item;
  });
  const evidence: Evidence = {
    id: `e${session.evidence.length + 1}`,
    choiceId,
    supports: selected.supports,
    challenges: selected.challenges,
    publicFact: selected.fact,
  };
  const next: MindSession = {
    ...session,
    hypotheses,
    evidence: [...session.evidence, evidence],
    lastFact: selected.fact,
    turn: session.turn + 1,
    scene: null,
  };
  if (next.turn >= 6) {
    const supported = [...hypotheses].sort((left, right) => right.weight - left.weight)[0]!;
    return {
      ...next,
      done: true,
      finale: {
        lines: [
          selected.fact,
          supported.weight > 1 ? 'Один из путей повторился чаще другого. Финал держится этого, не догадки.' : 'Пути разошлись. Финал не выбирает за тебя, какой был настоящим.',
          'Желание на экран не возвращается.',
        ].map((line) => scrub(next.intake, next.person, line)),
        signs: signsFor(next),
      },
    };
  }
  return compose(next);
}

export function internalTrace(session: MindSession): TraceStep[] {
  return session.trace;
}
