import assert from 'node:assert/strict';
import test from 'node:test';

import { foundationInventory } from './caelusFoundation.ts';

test('first corpus contains real public-domain Jyotish Moon nakshatra keys', () => {
  const records = foundationInventory('jyotish');
  assert.equal(records.length, 27);
  assert.ok(records.every((record) =>
    record.kind === 'nakshatra' &&
    record.rights === 'pd-us' &&
    record.sourceId === 'varahamihira-brihat-jataka',
  ));
  assert.equal(new Set(records.map((record) => record.id)).size, records.length);
});

test('western historical corpus uses aspect keys and excludes rising stereotypes', () => {
  const records = foundationInventory('western-historical');
  assert.ok(records.length > 100);
  assert.ok(records.every((record) =>
    record.kind === 'aspect' &&
    record.rights === 'pd-us' &&
    record.sourceId === 'heindel-message-of-the-stars',
  ));
  assert.equal(new Set(records.map((record) => record.id)).size, records.length);
});
