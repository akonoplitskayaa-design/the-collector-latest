import { Body, Ecliptic, EclipticGeoMoon, GeoVector, SiderealTime, SunPosition } from 'astronomy-engine';
import {
  meanLunarNodes,
  natalAspects,
  natalTransitAspects,
  vimshottariTimeline,
  type EclipticPosition,
} from './astrology.ts';

type ChartFact = {
  source: string;
  precision: 'computed' | 'approximate' | 'unknown';
  theme: 'price' | 'appetite' | 'time' | 'agency' | 'release' | 'visibility' | 'reciprocity';
};

type ReadingInput = {
  birth: { date: string; time: string | null; place: string | null };
  referenceInstant?: string;
};

export type PersonReading = {
  precision: {
    time: 'resolved' | 'unknown';
    place: 'resolved' | 'unknown';
    positions: 'computed';
    angles: 'computed' | 'unavailable';
  };
  instant: string;
  reference: string;
  moonSidereal: number;
  mahadasha: string | null;
  antardasha: string | null;
  tightestTransit: string | null;
  ascendant: number | null;
  facts: ChartFact[];
  natalFigures: string[];
  pressure: 'limit' | 'nearness' | 'sudden' | 'ahead';
  zodiac: 'sidereal';
  ayanamsa: 'Lahiri';
  nakshatra: string;
  nakshatraPada: number;
  retrograde: string[];
  houses: { body: string; house: number }[] | null;
};

const PLACES: Record<string, { latitude: number; longitude: number; timeZone: string }> = {
  moscow: { latitude: 55.7558, longitude: 37.6173, timeZone: 'Europe/Moscow' },
  москва: { latitude: 55.7558, longitude: 37.6173, timeZone: 'Europe/Moscow' },
  bali: { latitude: -8.4095, longitude: 115.1889, timeZone: 'Asia/Makassar' },
  singaraja: { latitude: -8.112, longitude: 115.088, timeZone: 'Asia/Makassar' },
  denpasar: { latitude: -8.6705, longitude: 115.2126, timeZone: 'Asia/Makassar' },
};

const NAKSHATRA = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const THEME: Record<string, ChartFact['theme']> = {
  Saturn: 'price',
  Ketu: 'price',
  Venus: 'appetite',
  Moon: 'appetite',
  Sun: 'visibility',
  Mercury: 'visibility',
  Mars: 'agency',
  Rahu: 'agency',
  Jupiter: 'time',
};

function normalize(value: number): number {
  return ((value % 360) + 360) % 360;
}

function round(value: number, digits = 4): number {
  return Number(value.toFixed(digits));
}

function longitude(body: Body, date: Date): number {
  if (body === Body.Sun) return SunPosition(date).elon;
  if (body === Body.Moon) return EclipticGeoMoon(date).lon;
  return Ecliptic(GeoVector(body, date, true)).elon;
}

function lahiri(date: Date): number {
  const years = (date.getTime() - Date.parse('2000-01-01T12:00:00Z')) / (365.2425 * 86_400_000);
  return 23.85675 + (50.290966 / 3600) * years;
}

function localToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  let utc = Date.UTC(year!, (month ?? 1) - 1, day, hour, minute);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(utc));
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const shown = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'));
    const wanted = Date.UTC(year!, (month ?? 1) - 1, day, hour, minute);
    utc += wanted - shown;
  }
  return new Date(utc);
}

function placeOf(name: string | null): { latitude: number; longitude: number; timeZone: string } | null {
  if (!name?.trim()) return null;
  const key = name.trim().toLocaleLowerCase();
  return PLACES[key] ?? Object.entries(PLACES).find(([place]) => key.includes(place))?.[1] ?? null;
}

function positions(date: Date): EclipticPosition[] {
  const ayanamsa = lahiri(date);
  const bodies: [string, Body][] = [
    ['Sun', Body.Sun], ['Moon', Body.Moon], ['Mercury', Body.Mercury], ['Venus', Body.Venus],
    ['Mars', Body.Mars], ['Jupiter', Body.Jupiter], ['Saturn', Body.Saturn],
  ];
  const planets = bodies.map(([name, body]) => {
    const tropicalLongitude = round(normalize(longitude(body, date)));
    return { body: name, tropicalLongitude, siderealLongitude: round(normalize(tropicalLongitude - ayanamsa)) };
  });
  const nodes = meanLunarNodes(date);
  return [
    ...planets,
    { body: 'North Node', tropicalLongitude: nodes.ascendingLongitude, siderealLongitude: round(normalize(nodes.ascendingLongitude - ayanamsa)) },
    { body: 'South Node', tropicalLongitude: nodes.descendingLongitude, siderealLongitude: round(normalize(nodes.descendingLongitude - ayanamsa)) },
  ];
}

function moonNakshatra(siderealLongitude: number): { name: string; pada: number } {
  const span = 360 / 27;
  const longitude = normalize(siderealLongitude);
  const index = Math.floor(longitude / span);
  const pada = Math.floor((longitude % span) / (span / 4)) + 1;
  return { name: NAKSHATRA[index] ?? 'Revati', pada };
}

function retrogradeBodies(date: Date): string[] {
  const earlier = new Date(date.getTime() - 86_400_000);
  const bodies: [string, Body][] = [
    ['Mercury', Body.Mercury], ['Venus', Body.Venus], ['Mars', Body.Mars],
    ['Jupiter', Body.Jupiter], ['Saturn', Body.Saturn],
  ];
  return bodies.filter(([, body]) => {
    let delta = longitude(body, date) - longitude(body, earlier);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta < 0;
  }).map(([name]) => name);
}

function ascendant(date: Date, latitude: number, longitudeDegrees: number): number {
  const theta = normalize(SiderealTime(date) * 15 + longitudeDegrees) * Math.PI / 180;
  const phi = latitude * Math.PI / 180;
  const centuries = (date.getTime() - Date.parse('2000-01-01T12:00:00Z')) / (36525 * 86_400_000);
  const obliquity = (23.439291 - 0.0130042 * centuries) * Math.PI / 180;
  return round(normalize(Math.atan2(-Math.cos(theta), Math.sin(theta) * Math.cos(obliquity) + Math.tan(phi) * Math.sin(obliquity)) * 180 / Math.PI));
}

export function readPerson(intake: ReadingInput): PersonReading {
  const place = placeOf(intake.birth.place);
  const timeKnown = Boolean(intake.birth.time && /^\d{2}:\d{2}/.test(intake.birth.time));
  const instant = timeKnown && place
    ? localToUtc(intake.birth.date, intake.birth.time!, place.timeZone)
    : new Date(`${intake.birth.date}T12:00:00Z`);
  const reference = intake.referenceInstant ? new Date(intake.referenceInstant) : new Date();
  const natal = positions(instant);
  const sky = positions(reference);
  const moon = natal.find((item) => item.body === 'Moon')!;
  const timeline = vimshottariTimeline(instant, moon.siderealLongitude ?? moon.tropicalLongitude, reference);
  const transit = natalTransitAspects(natal, sky, 3)[0] ?? null;
  const dashaLord = timeline.currentMahadasha?.lord ?? 'Saturn';
  const facts: ChartFact[] = [{
    source: `${dashaLord} mahadasha`,
    precision: 'computed',
    theme: THEME[dashaLord] ?? 'reciprocity',
  }];
  if (transit) facts.unshift({
    source: `${transit.transitBody} ${transit.aspect} natal ${transit.natalBody}`,
    precision: 'computed',
    theme: THEME[transit.transitBody] ?? 'reciprocity',
  });
  const pairs = natalAspects(natal, 6);
  const natalFigures = pairs.slice(0, 6).map((item) => `${item.transitBody} ${item.aspect} ${item.natalBody} ${item.orb}°`);
  const hard = pairs.filter((item) => item.aspect === 'square' || item.aspect === 'opposition');
  const venusSaturn = hard.find((item) => {
    const names = `${item.transitBody} ${item.natalBody}`;
    return names.includes('Venus') && names.includes('Saturn');
  });
  const venusCluster = pairs.find((item) => {
    const names = `${item.transitBody} ${item.natalBody}`;
    return item.aspect === 'conjunction' && names.includes('Venus') && (names.includes('Mars') || names.includes('Jupiter'));
  });
  const pressure = venusSaturn && venusSaturn.orb <= 4
    ? 'limit'
    : venusCluster
      ? 'nearness'
      : dashaLord === 'Rahu' || dashaLord === 'Ketu'
        ? 'sudden'
        : transit?.transitBody === 'Jupiter'
          ? 'ahead'
          : 'nearness';
  const angles = timeKnown && place ? 'computed' : 'unavailable';
  const rising = angles === 'computed' ? ascendant(instant, place!.latitude, place!.longitude) : null;
  const ayanamsa = lahiri(instant);
  const siderealRising = rising === null ? null : normalize(rising - ayanamsa);
  const star = moonNakshatra(moon.siderealLongitude ?? moon.tropicalLongitude);
  return {
    precision: {
      time: timeKnown && place ? 'resolved' : 'unknown',
      place: place ? 'resolved' : 'unknown',
      positions: 'computed',
      angles,
    },
    instant: instant.toISOString(),
    reference: reference.toISOString(),
    moonSidereal: moon.siderealLongitude ?? moon.tropicalLongitude,
    mahadasha: timeline.currentMahadasha?.lord ?? null,
    antardasha: timeline.currentAntardasha?.lord ?? null,
    tightestTransit: transit ? `${transit.transitBody} ${transit.aspect} natal ${transit.natalBody}` : null,
    ascendant: rising,
    facts,
    natalFigures,
    pressure,
    zodiac: 'sidereal',
    ayanamsa: 'Lahiri',
    nakshatra: star.name,
    nakshatraPada: star.pada,
    retrograde: retrogradeBodies(instant),
    houses: siderealRising === null ? null : natal.map((item) => ({
      body: item.body,
      house: Math.floor(normalize((item.siderealLongitude ?? item.tropicalLongitude) - siderealRising) / 30) + 1,
    })),
  };
}
