import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseMind, internalTrace, openMind } from './mind.ts';
import { PRINCIPLES } from './principles.ts';

const WISH = 'Я хочу, чтобы человек, которого я люблю, сам захотел вернуться ко мне.';

function born(date: string, reference: string) {
  return openMind({
    name: 'Анна',
    desire: WISH,
    birth: { date, time: '10:00', place: 'Moscow' },
    referenceInstant: reference,
  });
}

test('the library is small enough to be used, and every selected principle is one of its entries', () => {
  assert.equal(PRINCIPLES.length >= 30 && PRINCIPLES.length <= 50, true);
  const session = born('1995-11-17', '2026-11-16T05:00:00Z');
  const ids = new Set(PRINCIPLES.map((item) => item.id));
  for (const step of internalTrace(session)) {
    const id = step.principle.split(' ')[0]!;
    assert.equal(ids.has(id), true);
    assert.equal(step.scene.join(' ').toLocaleLowerCase().includes('saturn'), false);
  }
});

test('A. the same wish and two charts do not receive the same directing task', () => {
  const anna = born('1995-11-17', '2026-11-16T05:00:00Z');
  const other = born('1990-06-21', '2026-11-16T05:00:00Z');
  const left = internalTrace(anna)[0]!;
  const right = internalTrace(other)[0]!;
  assert.notEqual(left.natal[0], right.natal[0]);
  assert.notEqual(left.synthesis, right.synthesis);
  assert.notEqual(left.scene.join('\n'), right.scene.join('\n'));
  assert.equal(left.hypothesis === right.hypothesis && left.principle === right.principle, false);
});

test('B. the same chart and wish fork when the act forks', () => {
  const start = born('1995-11-17', '2026-11-16T05:00:00Z');
  const seat = chooseMind(start, 'clear-seat');
  const hand = chooseMind(start, 'offer-hand');
  assert.notEqual(seat.scene?.lines.join('\n'), hand.scene?.lines.join('\n'));
  assert.match(seat.scene?.lines.join(' ') ?? '', /садится/);
  assert.match(hand.scene?.lines.join(' ') ?? '', /руку/);
  assert.notEqual(
    seat.hypotheses.find((item) => item.id === 'unforced')?.weight,
    hand.hypotheses.find((item) => item.id === 'unforced')?.weight,
  );
  const second = internalTrace(seat).at(-1)!;
  assert.match(second.scene.join(' '), /садится/);
  assert.match(second.natal.join(' '), /dasha/);
});

test('C. the same person in two periods is not directed as one period', () => {
  const early = born('1995-11-17', '2026-11-16T05:00:00Z');
  const late = born('1995-11-17', '2030-11-16T05:00:00Z');
  assert.notEqual(early.person.antardasha, late.person.antardasha);
  const left = chooseMind(chooseMind(early, 'clear-seat'), early.scene ? 'leave-fruit' : 'clear-seat');
  const right = chooseMind(chooseMind(late, 'clear-seat'), late.scene ? 'leave-fruit' : 'clear-seat');
  const leftTrace = internalTrace(left).at(-1)!;
  const rightTrace = internalTrace(right).at(-1)!;
  assert.notEqual(leftTrace.natal[1], rightTrace.natal[1]);
  assert.notEqual(leftTrace.scene.join('\n'), rightTrace.scene.join('\n'));
});

test('the questions do not return after the opening', () => {
  let session = born('1995-11-17', '2026-11-16T05:00:00Z');
  const seen = new Set<string>();
  while (session.scene) {
    const labels = session.scene.choices.map((choice) => choice.label).join('|');
    assert.equal(seen.has(labels), false);
    seen.add(labels);
    session = chooseMind(session, session.scene.choices[0]!.id);
  }
  assert.equal(seen.size >= 6, true);
  assert.equal(session.done, true);
});

test('an unknown birth time does not invent houses', () => {
  const session = openMind({
    name: 'Анна', desire: WISH,
    birth: { date: '1995-11-17', time: null, place: null },
    referenceInstant: '2026-11-16T05:00:00Z',
  });
  assert.equal(session.person.houses, null);
  assert.equal(session.person.ascendant, null);
  assert.match(internalTrace(session)[0]!.natal.join(' '), /unavailable/);
});
