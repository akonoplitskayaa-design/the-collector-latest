export type EclipticPosition = {
  body: string;
  tropicalLongitude: number;
  siderealLongitude?: number;
};

export type CrossAspect = {
  transitBody: string;
  natalBody: string;
  aspect: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  angle: number;
  orb: number;
};

export type VimshottariPeriod = {
  lord: string;
  startsAt: string;
  endsAt: string;
};

const DAY_MS = 86_400_000;
const TROPICAL_YEAR_DAYS = 365.2425;
const DASHA_LORDS = [
  ['Ketu', 7], ['Venus', 20], ['Sun', 6], ['Moon', 10], ['Mars', 7],
  ['Rahu', 18], ['Jupiter', 16], ['Saturn', 19], ['Mercury', 17],
] as const;

const ASPECTS = [
  ['conjunction', 0], ['sextile', 60], ['square', 90], ['trine', 120], ['opposition', 180],
] as const;

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function shortestSeparation(left: number, right: number): number {
  const difference = Math.abs(normalizeDegrees(left) - normalizeDegrees(right));
  return Math.min(difference, 360 - difference);
}

/**
 * Mean lunar node from the standard polynomial for the Moon's mean ascending
 * node. This deliberately does not claim the true/oscillating node.
 */
export function meanLunarNodes(date: Date) {
  const centuries = (date.getTime() - Date.parse('2000-01-01T12:00:00Z')) / (36525 * DAY_MS);
  const ascending = normalizeDegrees(
    125.04455501
      - 1934.1361849 * centuries
      + 0.0020762 * centuries ** 2
      + centuries ** 3 / 467410
      - centuries ** 4 / 60616000,
  );
  return {
    model: 'mean lunar node; Meeus-style polynomial, not true node',
    ascendingLongitude: round(ascending),
    descendingLongitude: round(normalizeDegrees(ascending + 180)),
  };
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function period(lord: string, start: Date, durationDays: number): VimshottariPeriod {
  return { lord, startsAt: start.toISOString(), endsAt: shiftDays(start, durationDays).toISOString() };
}

function findPeriod(periods: VimshottariPeriod[], reference: Date): number {
  const value = reference.getTime();
  return periods.findIndex((item) => Date.parse(item.startsAt) <= value && value < Date.parse(item.endsAt));
}

/**
 * Deterministic Vimshottari timing from the sidereal Moon. The calculation is
 * structurally useful to the Director, while its precision inherits the Moon
 * longitude and ayanamsa precision supplied by the caller.
 */
export function vimshottariTimeline(birthInstant: Date, moonSiderealLongitude: number, referenceInstant: Date) {
  const nakshatraSpan = 360 / 27;
  const nakshatraIndex = Math.floor(normalizeDegrees(moonSiderealLongitude) / nakshatraSpan);
  const progress = (normalizeDegrees(moonSiderealLongitude) % nakshatraSpan) / nakshatraSpan;
  const firstLordIndex = nakshatraIndex % DASHA_LORDS.length;
  const firstYears = DASHA_LORDS[firstLordIndex]![1];
  const firstStart = shiftDays(birthInstant, -progress * firstYears * TROPICAL_YEAR_DAYS);

  const majorPeriods: VimshottariPeriod[] = [];
  let cursor = firstStart;
  // Two full 120-year cycles safely cover ordinary human timelines and the
  // nearby future without pretending to select meaningful periods forever.
  for (let step = 0; step < DASHA_LORDS.length * 2; step += 1) {
    const [lord, years] = DASHA_LORDS[(firstLordIndex + step) % DASHA_LORDS.length]!;
    const item = period(lord, cursor, years * TROPICAL_YEAR_DAYS);
    majorPeriods.push(item);
    cursor = new Date(item.endsAt);
  }

  const majorIndex = findPeriod(majorPeriods, referenceInstant);
  const currentMajor = majorPeriods[majorIndex] ?? null;
  let subPeriods: VimshottariPeriod[] = [];
  let subIndex = -1;
  if (currentMajor) {
    const majorLordIndex = DASHA_LORDS.findIndex(([lord]) => lord === currentMajor.lord);
    const majorYears = DASHA_LORDS[majorLordIndex]![1];
    let subCursor = new Date(currentMajor.startsAt);
    subPeriods = DASHA_LORDS.map((_, offset) => {
      const [lord, years] = DASHA_LORDS[(majorLordIndex + offset) % DASHA_LORDS.length]!;
      const item = period(lord, subCursor, majorYears * years / 120 * TROPICAL_YEAR_DAYS);
      subCursor = new Date(item.endsAt);
      return item;
    });
    subIndex = findPeriod(subPeriods, referenceInstant);
  }

  return {
    system: 'Vimshottari, 120-year cycle',
    basis: {
      nakshatraIndex,
      nakshatraProgress: round(progress, 6),
      startingLord: DASHA_LORDS[firstLordIndex]![0],
    },
    previousMahadasha: majorIndex > 0 ? majorPeriods[majorIndex - 1] : null,
    currentMahadasha: currentMajor,
    nextMahadasha: majorIndex >= 0 ? majorPeriods[majorIndex + 1] ?? null : null,
    previousAntardasha: subIndex > 0 ? subPeriods[subIndex - 1] : null,
    currentAntardasha: subIndex >= 0 ? subPeriods[subIndex] ?? null : null,
    nextAntardasha: subIndex >= 0 ? subPeriods[subIndex + 1] ?? null : null,
  };
}

export function natalAspects(natal: EclipticPosition[], maximumOrb = 6): CrossAspect[] {
  const result: CrossAspect[] = [];
  for (let left = 0; left < natal.length; left += 1) {
    for (let right = left + 1; right < natal.length; right += 1) {
      const a = natal[left]!;
      const b = natal[right]!;
      if (a.body.includes('Node') || b.body.includes('Node')) continue;
      const separation = shortestSeparation(a.tropicalLongitude, b.tropicalLongitude);
      for (const [aspect, angle] of ASPECTS) {
        const orb = Math.abs(separation - angle);
        if (orb <= maximumOrb) {
          result.push({
            transitBody: a.body,
            natalBody: b.body,
            aspect,
            angle,
            orb: round(orb, 3),
          });
          break;
        }
      }
    }
  }
  return result.sort((left, right) => left.orb - right.orb);
}

export function natalTransitAspects(
  natal: EclipticPosition[],
  transits: EclipticPosition[],
  maximumOrb = 3,
): CrossAspect[] {
  const result: CrossAspect[] = [];
  for (const transit of transits) {
    for (const natalPosition of natal) {
      const separation = shortestSeparation(transit.tropicalLongitude, natalPosition.tropicalLongitude);
      for (const [aspect, angle] of ASPECTS) {
        const orb = Math.abs(separation - angle);
        if (orb <= maximumOrb) {
          result.push({
            transitBody: transit.body,
            natalBody: natalPosition.body,
            aspect,
            angle,
            orb: round(orb, 3),
          });
          break;
        }
      }
    }
  }
  return result.sort((left, right) => left.orb - right.orb);
}

function aspectKey(aspect: CrossAspect): string {
  return `${aspect.transitBody}:${aspect.aspect}:${aspect.natalBody}`;
}

/** Compares three astronomical snapshots without turning them into predictions. */
export function compareTransitWindows(
  past: CrossAspect[],
  current: CrossAspect[],
  upcoming: CrossAspect[],
) {
  const pastByKey = new Map(past.map((item) => [aspectKey(item), item]));
  const currentByKey = new Map(current.map((item) => [aspectKey(item), item]));
  const upcomingByKey = new Map(upcoming.map((item) => [aspectKey(item), item]));
  const currentActivations = current.slice(0, 16).map((item) => {
    const before = pastByKey.get(aspectKey(item));
    const after = upcomingByKey.get(aspectKey(item));
    const movement = !before && !after ? 'brief-window'
      : !before ? 'entered-since-past-snapshot'
        : !after ? 'leaves-before-upcoming-snapshot'
          : after.orb < item.orb ? 'intensifying-toward-upcoming-snapshot'
            : after.orb > item.orb ? 'separating-by-upcoming-snapshot'
              : 'similar-orb-across-snapshots';
    return { ...item, movement, pastOrb: before?.orb ?? null, upcomingOrb: after?.orb ?? null };
  });
  const upcomingActivations = upcoming
    .filter((item) => !currentByKey.has(aspectKey(item)))
    .slice(0, 12)
    .map((item) => ({ ...item, movement: 'present-in-upcoming-snapshot' }));
  const recentlySeparated = past
    .filter((item) => !currentByKey.has(aspectKey(item)))
    .slice(0, 12)
    .map((item) => ({ ...item, movement: 'present-in-past-snapshot' }));
  return { recentlySeparated, currentActivations, upcomingActivations };
}

