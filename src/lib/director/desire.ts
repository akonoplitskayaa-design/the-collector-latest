export type DesireReading = {
  otherPerson: boolean;
  unforcedMovement: boolean;
  possession: boolean;
  summary: string;
};

export function readDesire(desire: string): DesireReading {
  const otherPerson = /(?:человек|кто-то|\b(?:someone|person|he|she)\b)/iu.test(desire);
  const unforcedMovement = /сам захотел|сам вернулся|по своей воле|of (?:his|her|their) own|without being asked|come back|return to me/iu.test(desire);
  const possession = /(?:деньг|богат|\b(?:money|wealth|buy|possess)\b)/iu.test(desire);
  const summary = unforcedMovement
    ? 'another person must move without being asked'
    : possession
      ? 'the wish hardens around holding an object'
      : otherPerson
        ? 'another person is part of the wish'
        : 'the wish has no second figure';
  return { otherPerson, unforcedMovement, possession, summary };
}
