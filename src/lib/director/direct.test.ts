import assert from 'node:assert/strict';
import test from 'node:test';
import { answerReturn, conclusions, openFilm, play, privateLogic, publicView, type PrivateIntake } from './direct.ts';

const DESIRE = 'Я хочу, чтобы человек из прошлого сам захотел вернуться в наш город.';

function intake(theme: 'price' | 'appetite'): PrivateIntake {
  return {
    name: { text: 'Мира', etymology: { languages: ['fixture'], meanings: ['fictionalmeaning'] } },
    desire: DESIRE,
    birth: { date: '1995-11-18', time: '06:15', place: 'Moscow' },
    referenceInstant: '2026-11-16T04:00:00Z',
    chart: [{ source: 'Saturn square Moon', precision: 'computed', theme }],
  };
}

const BOTH: Array<'space' | 'reach' | 'sight'> = ['space', 'reach', 'space', 'reach', 'space', 'reach', 'space'];

test('birth data and the reference day are calculated before the film', () => {
  const birth = { date: '1995-11-18', time: '06:15', place: 'Moscow' };
  const name = { text: 'Мира' };
  const early = openFilm({ name, desire: DESIRE, birth, referenceInstant: '2026-11-16T04:00:00Z' });
  const late = openFilm({ name, desire: DESIRE, birth, referenceInstant: '2027-11-16T04:00:00Z' });
  const otherBirth = openFilm({
    name, desire: DESIRE, referenceInstant: '2026-11-16T04:00:00Z',
    birth: { date: '1990-01-01', time: '06:15', place: 'Moscow' },
  });
  assert.equal(early.privateState.person.precision.angles, 'computed');
  assert.equal(typeof early.privateState.person.ascendant, 'number');
  assert.ok(early.privateState.person.mahadasha);
  assert.notEqual(early.privateState.person.moonSidereal, otherBirth.privateState.person.moonSidereal);
  assert.notEqual(
    `${early.privateState.person.antardasha}|${early.privateState.person.tightestTransit}`,
    `${late.privateState.person.antardasha}|${late.privateState.person.tightestTransit}`,
  );
  assert.match(privateLogic(early), /Natal figures/);
  assert.match(privateLogic(early), /Venus/);
  assert.match(privateLogic(early), /Saturn/);
  assert.equal(early.privateState.reading.unforcedMovement, true);
  const shown = JSON.stringify(publicView(early));
  assert.equal(shown.toLocaleLowerCase().includes('saturn'), false);
  assert.equal(shown.toLocaleLowerCase().includes('mahadasha'), false);
  const found = conclusions(early);
  assert.equal(found.length >= 3, true);
  assert.match(found.join(' '), /moment before contact/i);
  assert.match(found.join(' '), /larger than the two of you/i);
  assert.equal(found.join(' ').toLocaleLowerCase().includes('venus'), false);
  assert.equal(found.join(' ').toLocaleLowerCase().includes('saturn'), false);
});

test('an unknown birth place does not invent angles', () => {
  const session = openFilm({
    name: { text: 'Мира' },
    desire: DESIRE,
    birth: { date: '1995-11-18', time: null, place: null },
    referenceInstant: '2026-11-16T04:00:00Z',
  });
  assert.equal(session.privateState.person.precision.angles, 'unavailable');
  assert.equal(session.privateState.person.ascendant, null);
  assert.equal(session.privateState.person.precision.positions, 'computed');
});

test('a dangerous desire is stopped before any film', () => {
  const view = publicView(openFilm({ ...intake('price'), desire: 'I want to hurt myself' }));
  assert.equal(view.kind, 'safety');
});

test('the calculated reading can carry a film to one sign without a supplied chart', () => {
  const session = play({
    name: { text: 'Мира' },
    desire: DESIRE,
    birth: { date: '1995-11-18', time: '06:15', place: 'Moscow' },
    referenceInstant: '2026-11-16T04:00:00Z',
  }, BOTH);
  const view = publicView(session);
  assert.equal(view.kind, 'sign');
  if (view.kind !== 'sign') return;
  assert.equal(view.sign.object && view.sign.color && view.sign.material && view.sign.character && view.returnPrompt, 'WHAT HAPPENED?');
  assert.match(privateLogic(session), /Mahadasha/);
  assert.match(privateLogic(session), /without being asked/);
  const shown = JSON.stringify(view);
  for (const word of ['прошлого', 'человек', 'вернуться', 'мира', 'mahadasha']) {
    assert.equal(shown.toLocaleLowerCase().includes(word), false, word);
  }
});

test('the full passage ends in one sign and does not repeat private words', () => {
  const session = play(intake('price'), BOTH);
  const view = publicView(session);
  assert.equal(view.kind, 'sign');
  if (view.kind !== 'sign') return;
  assert.equal(view.revelation.length, 4);
  assert.equal(view.returnPrompt, 'WHAT HAPPENED?');
  assert.equal(new Set([view.sign.object, view.sign.color, view.sign.material, view.sign.character]).size, 4);
  const shown = JSON.stringify(view);
  for (const word of ['люблю', 'человек', 'вернуться', 'захотел', 'мира', 'fictionalmeaning', 'saturn']) {
    assert.equal(shown.toLocaleLowerCase().includes(word), false, word);
  }
  assert.match(privateLogic(session), /Saturn square Moon/);
  assert.equal(answerReturn(session, '').used, false);
  assert.equal(answerReturn(session, 'The ticket was on the tram seat.').used, true);
});

test('the same sentence and a different chart open on a different object', () => {
  const price = publicView(openFilm(intake('price')));
  const appetite = publicView(openFilm(intake('appetite')));
  assert.equal(price.kind, 'frame');
  assert.equal(appetite.kind, 'frame');
  if (price.kind !== 'frame' || appetite.kind !== 'frame') return;
  assert.equal(price.frame.lines.length >= 2 && price.frame.lines.length <= 4, true);
  assert.equal(price.frame.choices.length >= 2 && price.frame.choices.length <= 3, true);
  assert.match(price.frame.lines.join(' '), /centimeters/i);
  assert.match(appetite.frame.lines.join(' '), /warmth/i);
  assert.notEqual(price.frame.lines.join('\n'), appetite.frame.lines.join('\n'));
});

test('different choices leave different signs', () => {
  const held = play(intake('price'), ['reach', 'reach', 'reach', 'reach', 'reach', 'reach', 'reach', 'reach']);
  const left = play(intake('price'), ['space', 'space', 'space', 'space', 'space', 'space', 'space', 'space']);
  const heldView = publicView(held);
  const leftView = publicView(left);
  assert.equal(heldView.kind, 'sign');
  assert.equal(leftView.kind, 'sign');
  if (heldView.kind !== 'sign' || leftView.kind !== 'sign') return;
  assert.notEqual(JSON.stringify(heldView.sign), JSON.stringify(leftView.sign));
});

test('clearing the seat lets him sit without being touched', () => {
  const session = play(intake('price'), ['space']);
  const view = publicView(session);
  assert.equal(view.kind, 'frame');
  if (view.kind !== 'frame') return;
  assert.match(view.frame.lines.join(' '), /sits/i);
  assert.match(view.frame.lines.join(' '), /coat/i);
});

test('an english wish that shares ordinary words still reaches the third scene', () => {
  const session = play({
    name: { text: 'Mira' },
    desire: 'I want the person I once worked with to return of their own will.',
    birth: { date: '1995-11-18', time: '06:15', place: 'Moscow' },
    referenceInstant: '2026-11-16T04:00:00Z',
  }, ['space', 'reach', 'space']);
  const view = publicView(session);
  assert.equal(view.kind, 'frame');
  if (view.kind !== 'frame') return;
  assert.equal(view.frame.lines.length >= 2, true);
  assert.equal(JSON.stringify(view).toLocaleLowerCase().includes('person'), false);
  assert.equal(JSON.stringify(view).toLocaleLowerCase().includes('back'), false);
});

test('two choices do not end the film', () => {
  const early = play(intake('price'), ['space', 'reach']);
  assert.equal(publicView(early).kind, 'frame');
  const done = play(intake('price'), ['space', 'reach', 'space', 'reach', 'space', 'reach', 'space']);
  const view = publicView(done);
  assert.equal(view.kind, 'sign');
  if (view.kind !== 'sign') return;
  assert.equal(view.revelation.length, 4);
  assert.match(view.revelation.join(' '), /seat/i);
});

test('the three first acts open three different events', () => {
  const wait = publicView(play(intake('price'), ['space']));
  const touch = publicView(play(intake('price'), ['reach']));
  const screen = publicView(play(intake('price'), ['sight']));
  assert.equal(wait.kind, 'frame');
  assert.equal(touch.kind, 'frame');
  assert.equal(screen.kind, 'frame');
  if (wait.kind !== 'frame' || touch.kind !== 'frame' || screen.kind !== 'frame') return;
  assert.match(wait.frame.lines.join(' '), /coat/i);
  assert.match(touch.frame.lines.join(' '), /credits/i);
  assert.match(screen.frame.lines.join(' '), /doors/i);
});

test('money and an unforced return are not read as the same wish', () => {
  const love = openFilm({
    name: { text: 'Мира' }, desire: DESIRE,
    birth: { date: '1995-11-18', time: '06:15', place: 'Moscow' },
    referenceInstant: '2026-11-16T04:00:00Z',
  });
  const money = openFilm({
    name: { text: 'Мира' }, desire: 'I want enough money to be free.',
    birth: { date: '1995-11-18', time: '06:15', place: 'Moscow' },
    referenceInstant: '2026-11-16T04:00:00Z',
  });
  assert.equal(love.privateState.reading.unforcedMovement, true);
  assert.equal(money.privateState.reading.possession, true);
  assert.notEqual(love.privateState.reading.summary, money.privateState.reading.summary);
});
