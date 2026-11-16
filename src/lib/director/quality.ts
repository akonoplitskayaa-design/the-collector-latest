export type LocalExperimentAction = {
  label: string;
  action: string;
  hypothesisId: string;
  competingHypothesisId: string;
  dimension: string;
  nextStateKey: string;
};

export type LocalSceneContract = {
  publicLines: string[];
  actions: LocalExperimentAction[];
  sensualDetail: string;
  irreversibleDetail: string;
  priorChoiceId: string | null;
  causalAnchorChoiceId: string | null;
};

const BANAL_PATTERNS = [
  /the answer (?:was|is) inside you/iu,
  /choose yourself/iu,
  /trust the (?:process|journey|universe)/iu,
  /everything happens for a reason/iu,
  /your heart already knows/iu,
  /let go and (?:trust|receive)/iu,
  /you were afraid to be seen/iu,
  /вс[её] уже внутри тебя/iu,
  /выбери себя/iu,
  /доверься (?:процессу|вселенной|пути)/iu,
  /вс[её] происходит неслучайно/iu,
  /тво[её] сердце уже знает/iu,
  /you are (?:the universe|everything|enough)/iu,
  /the universe (?:chose|is testing|has a plan|wants)/iu,
  /what you seek is seeking you/iu,
  /the journey (?:was|is) the destination/iu,
  /you were the (?:key|door|answer) all along/iu,
  /it was never about/iu,
  /вселенная (?:выбрала|проверяет|знает|хочет)/iu,
  /ты (?:и есть|всегда был[аи]?) (?:ключ|дверь|ответ)/iu,
  /дело никогда не было в/iu,
];

const EXPLANATORY_PATTERNS = [
  /your choice (?:means|suggests|shows)/iu,
  /your subconscious/iu,
  /your pattern/iu,
  /this symbolizes/iu,
  /выбор (?:означает|показывает)/iu,
  /тво[её] подсознание/iu,
  /это символизирует/iu,
];

const INTROSPECTIVE_ACTION = /\b(think|decide what you feel|explain|describe|analyze|choose what it means|подумай|объясни|опиши|проанализируй|реши,? что чувствуешь)\b/iu;
const PHYSICAL_VERB = /\b(touch|take|leave|step|stand|sit|turn|look|hold|release|open|close|cross|raise|lower|wait|press|enter|stay|drop|move|reach|hide|show|push|rub|slide|brace|keep|lift|pull|complete|let|pass|косн|возьм|остав|шаг|встан|сяд|повер|смотр|держ|отпуст|открой|закрой|перейд|подним|опуст|жди|нажм|войди|остань|брос|двин|спряч|покаж|толк|тр[её]|скольз|упрись|сохрани|тяни|пройди)/iu;

export function findBanalLanguage(text: string): string[] {
  return BANAL_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export function findExplanatoryLanguage(text: string): string[] {
  return EXPLANATORY_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export function evaluatePhilosophicalMechanics(input: {
  operation: string;
  publicLines: string[];
  physicalActions: string[];
  causalConsequence: string;
  irreversibleDetail: string;
  roleReversalTarget: string;
  consequenceLaw: string;
}) {
  const publicText = input.publicLines.join(' ');
  const issues: string[] = [];
  if (findBanalLanguage(publicText).length > 0) issues.push('philosophical language collapses into a familiar aphorism');
  if (findExplanatoryLanguage(publicText).length > 0) issues.push('the visible scene explains its private interpretation');
  if (!input.operation.trim()) issues.push('no philosophical operation was selected');
  if (!input.roleReversalTarget.trim()) issues.push('the philosophical operation has no role-transfer target');
  if (!input.consequenceLaw.trim()) issues.push('the philosophical operation has no consequence law');
  if (input.physicalActions.length < 2) issues.push('the philosophical question has fewer than two physical tests');
  if (input.causalConsequence.trim().length < 12) issues.push('the philosophical turn is not expressed through a concrete consequence');
  if (input.irreversibleDetail.trim().length < 8) issues.push('the philosophical turn lacks an irreversible material trace');
  return {
    passed: issues.length === 0,
    issues,
    limitation: 'This gate checks required fields and explicit cliches only. It cannot verify embodied philosophy, emotional force or semantic causality; those require criticism of the actual scene.',
  };
}

/**
 * Checks contracts that code can verify. Scores do not claim literary quality;
 * they only stop structurally weak material from masquerading as a strong take.
 */
export function evaluateLocalSceneContract(scene: LocalSceneContract) {
  const publicText = scene.publicLines.join(' ');
  const issues: string[] = [];
  const probeKeys = scene.actions.map((action) =>
    `${action.hypothesisId}|${action.competingHypothesisId}|${action.dimension}`.toLocaleLowerCase());
  const nextStates = scene.actions.map((action) => action.nextStateKey);
  const physicalActions = scene.actions.filter((action) => PHYSICAL_VERB.test(action.action) && !INTROSPECTIVE_ACTION.test(action.action));

  if (scene.publicLines.length < 2 || scene.publicLines.length > 4) issues.push('scene must contain two to four public lines');
  if (scene.actions.length < 2 || scene.actions.length > 3) issues.push('scene must contain two or three actions');
  if (physicalActions.length !== scene.actions.length) issues.push('every action must be physical rather than introspective');
  if (new Set(probeKeys).size !== probeKeys.length) issues.push('actions must test distinct hypothesis comparisons');
  if (scene.actions.some((action) => action.hypothesisId === action.competingHypothesisId)) issues.push('an action cannot compare a hypothesis with itself');
  if (new Set(nextStates).size !== nextStates.length) issues.push('different actions require exclusive next-state consequences');
  if (scene.sensualDetail.trim().length < 8) issues.push('sensory or spatial reality is missing');
  if (scene.irreversibleDetail.trim().length < 8) issues.push('irreversible causal detail is missing');
  if (scene.priorChoiceId && scene.causalAnchorChoiceId !== scene.priorChoiceId) issues.push('causal anchor does not match the actual prior choice');
  if (findBanalLanguage(publicText).length > 0) issues.push('public language contains a generic spiritual conclusion');
  if (findExplanatoryLanguage(publicText).length > 0) issues.push('public language exposes the hidden interpretation');

  return {
    passed: issues.length === 0,
    issues,
    contractScores: {
      physicality: scene.actions.length === 0 ? 0 : physicalActions.length / scene.actions.length,
      choiceDiscrimination: scene.actions.length === 0 ? 0 : new Set(probeKeys).size / scene.actions.length,
      branchExclusivity: scene.actions.length === 0 ? 0 : new Set(nextStates).size / scene.actions.length,
      causalGrounding: scene.priorChoiceId ? Number(scene.causalAnchorChoiceId === scene.priorChoiceId) : 1,
      hiddenness: Number(findExplanatoryLanguage(publicText).length === 0),
      banalityGuard: Number(findBanalLanguage(publicText).length === 0),
    },
    limitation: 'A passing result verifies structure only; it is not evidence of emotional or literary excellence.',
  };
}
