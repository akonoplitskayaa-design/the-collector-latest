export type SeatDirection = 'space' | 'reach' | 'sight';
export type SeatLure = 'sudden' | 'limit' | 'taste' | 'ahead';

type Beat = { lines: string[]; choices: { direction: SeatDirection; label: string }[] };

const OPEN: Beat['choices'] = [
  { direction: 'space', label: 'Clear the seat beside you.' },
  { direction: 'reach', label: 'Offer him your hand.' },
  { direction: 'sight', label: 'Stand, and ask him to leave with you.' },
];

const BEATS: Record<string, Beat> = {
  space: {
    lines: [
      'You move your coat. The seat is clear. He sits, and he does not touch you.',
      'The screen goes dark. What remains between you is the width of the armrest.',
      'He is the one who closed the distance, and only by sitting.',
    ],
    choices: [
      { direction: 'space', label: 'Say nothing.' },
      { direction: 'reach', label: 'Turn your face to him.' },
      { direction: 'sight', label: 'Stand, and leave the seat empty again.' },
    ],
  },
  reach: {
    lines: [
      'He takes your hand. The credits are still moving, and he sits without letting go.',
      'The house lights find the two of you still joined.',
      'From the last row, one laugh, as if this were the ending the film had missed.',
    ],
    choices: [
      { direction: 'space', label: 'Leave your hand in his.' },
      { direction: 'reach', label: 'Draw your hand away.' },
      { direction: 'sight', label: 'Look at the doors, and stay seated.' },
    ],
  },
  sight: {
    lines: [
      'You stand. The aisle is short, and the doors are already in his face.',
      'He walks half a step behind you. The film stays in the row you left.',
      'He still has not taken the last step. The invitation is not finished.',
    ],
    choices: [
      { direction: 'space', label: 'Walk through the doors.' },
      { direction: 'reach', label: 'Stop and turn to him.' },
      { direction: 'sight', label: 'Sit down again.' },
    ],
  },
  'space/space': {
    lines: [
      'The credits end. Neither of you speaks.',
      'His shoulder stays a hand\'s width from yours. He does not close it.',
    ],
    choices: [
      { direction: 'space', label: 'Leave that width as it is.' },
      { direction: 'reach', label: 'Move until your knee meets his.' },
    ],
  },
  'space/reach': {
    lines: [
      'He looks at you. The smile stays in the corner of his mouth.',
      'He still does not touch you.',
    ],
    choices: [
      { direction: 'space', label: 'Hold his look.' },
      { direction: 'reach', label: 'Touch his sleeve.' },
    ],
  },
  'space/sight': {
    lines: [
      'You stand. The seat you cleared is empty again.',
      'He stands because you stood. The question is in the aisle once more.',
    ],
    choices: [
      { direction: 'space', label: 'Remain standing beside him.' },
      { direction: 'reach', label: 'Sit, and let him choose the seat again.' },
    ],
  },
  'reach/space': {
    lines: [
      'The lights are full. Your hand is still in his.',
      'The row has not asked either of you to leave.',
    ],
    choices: [
      { direction: 'space', label: 'Stay until the lights dim.' },
      { direction: 'reach', label: 'Stand, still holding, and walk the aisle.' },
    ],
  },
  'reach/reach': {
    lines: [
      'Your hand leaves his. He keeps the seat.',
      'The laugh in the last row stops.',
    ],
    choices: [
      { direction: 'space', label: 'Let the silence keep the seat.' },
      { direction: 'reach', label: 'Offer your hand again.' },
    ],
  },
  'reach/sight': {
    lines: [
      'You look at the doors. His hand stays around yours.',
      'The street is a bright rectangle, and you are still in the seat.',
    ],
    choices: [
      { direction: 'space', label: 'Stay seated, watching that light.' },
      { direction: 'reach', label: 'Stand, and walk him toward that light.' },
    ],
  },
  'sight/space': {
    lines: [
      'The doors open. He takes the step he had not taken.',
      'The street is on your faces. The film is a dark room beyond the glass.',
    ],
    choices: [
      { direction: 'space', label: 'Walk, and let him keep the half step.' },
      { direction: 'reach', label: 'Stop on the pavement and face him.' },
    ],
  },
  'sight/reach': {
    lines: [
      'You stop. He is closer than he was beside the seat.',
      'The doors stay shut.',
    ],
    choices: [
      { direction: 'space', label: 'Stay in that closeness and say nothing.' },
      { direction: 'reach', label: 'Open the door without looking away.' },
    ],
  },
  'sight/sight': {
    lines: [
      'You sit. He remains standing.',
      'The seat beside you is free, and he does not ask a second time.',
    ],
    choices: [
      { direction: 'space', label: 'Leave the seat free and look ahead.' },
      { direction: 'reach', label: 'Look up at him, and wait.' },
    ],
  },
};

const AFTER: Record<string, string[]> = {
  'space/space/space': ['You leave the width. The credits are over, and his shoulder does not move.'],
  'space/space/reach': ['Your knee meets his. He does not pull away. Neither of you has spoken.'],
  'space/reach/space': ['You hold his look. The smile stays. His hands stay on his own knees.'],
  'space/reach/reach': ['Your fingers find his sleeve. He looks down at them, and does not take your hand.'],
  'space/sight/space': ['You remain standing. He remains standing. The empty seat is between you and the row.'],
  'space/sight/reach': ['You sit. He looks at the seat, then sits, still without touching you.'],
  'reach/space/space': ['You stay. The lights dim with your hand still in his.'],
  'reach/space/reach': ['You stand, still holding, and walk the aisle. He walks with the hand he has not released.'],
  'reach/reach/space': ['The silence keeps the seat. Your hand stays in your lap. He does not reach for it.'],
  'reach/reach/reach': ['You offer your hand again. This time he looks at it before he takes it.'],
  'reach/sight/space': ['You stay seated. The bright rectangle stays in front of you. His hand stays around yours.'],
  'reach/sight/reach': ['You stand and walk him toward the light. The doors get larger. He does not let go.'],
  'sight/space/space': ['You walk. He keeps the half step, all the way down the street.'],
  'sight/space/reach': ['You stop on the pavement and face him. The cinema is behind the glass. He stops too.'],
  'sight/reach/space': ['You stay close in the aisle and say nothing. The doors stay shut.'],
  'sight/reach/reach': ['You open the door without looking away. Street light falls on his face, and on yours.'],
  'sight/sight/space': ['You leave the seat free and look ahead. He is still standing. He does not sit.'],
  'sight/sight/reach': ['You look up. He waits, and then he sits, because you looked.'],
};

function closing(path: string): Beat['choices'] {
  return [
    { direction: 'space', label: 'Leave it exactly like this.' },
    { direction: 'reach', label: 'Change it with one touch.' },
  ];
}

export function seatBeat(path: string, lure: SeatLure): Beat {
  if (path === '') {
    const lines = lure === 'sudden'
      ? ['The row was empty. A voice you know asks if the seat is free.', 'He is standing in the aisle. He hoped you would still be here. He has not sat down.']
      : lure === 'ahead'
        ? ['The film is ending. On the screen he is already in the aisle. Then he is actually there.', 'He asks if the seat is free. He hoped you would still be here. He has not sat down.']
        : lure === 'taste'
          ? ['The film is ending. The warmth of him reaches you before he speaks.', 'He asks if the seat is free. He hoped you would still be here. He has not sat down.']
          : ['The film is ending. The row is almost empty, and you are still in your seat.', 'A voice you know asks if the seat beside you is free. He hoped you would still be here.', 'He does not sit. A few centimeters of aisle remain between you.'];
    return { lines, choices: OPEN };
  }
  const known = BEATS[path];
  if (known) return known;
  const lines = AFTER[path] ?? ['He is still in front of you. The seat is still the question.'];
  return { lines, choices: closing(path) };
}

export function seatEnding(path: string): string[] {
  const first = path.split('/')[0];
  const done = AFTER[path.split('/').slice(0, 3).join('/')]?.[0]
    ?? 'The last thing you did is still in the row.';
  const opened = first === 'reach'
    ? 'You offered your hand, and he took it.'
    : first === 'sight'
      ? 'You stood, and he followed you toward the doors.'
      : 'You cleared the seat, and he sat without touching you.';
  return [
    'He asked whether the seat was free. He had hoped you were still there.',
    opened,
    done,
    'The film is over. What remains is the seat, and what you did with it.',
  ];
}
