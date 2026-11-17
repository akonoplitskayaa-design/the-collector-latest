# NatalPersonalSynthesis adversarial suite

Tested against the 16 Nov 2026 archive `COLLECTOR_GROK_LATEST.zip`.
Production Director was not modified.

The archive names earlier commits `42a841e` and `c9e3e30` in STATUS.md.
`natalSynthesis.ts` in that archive is dated 2026-11-16 12:56 and has no commit hash of its own inside the zip.

Run from the extracted archive:

`node --experimental-strip-types --test tests/adversarial/natalPersonalSynthesis.adversarial.test.ts`

Result: 10 tests, 0 PASS, 10 FAIL.

1. correlation accepted as cause — FAIL
2. contrary calculated aspect can be omitted — FAIL
3. excluded-factor chart change can still change the decision — FAIL
4. a different cited natal fact can keep the same decision — FAIL
5. removing the cited period does not change the decision — FAIL
6. an unused name change blocks reuse — FAIL
7. desire wording is accepted as a natal claim — FAIL
8. a correct source ref does not prove the claim — FAIL
9. a contradicting action keeps the claim and the selected reading — FAIL
10. new review wording leaves the kernel scene unchanged — FAIL

Older tests against `PersonalSynthesis` do not apply to this file.
