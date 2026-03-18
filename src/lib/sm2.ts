import { Person } from './db';

// Quality:
// 0: Complete blackout
// 1: Incorrect, but remembered upon seeing answer
// 2: Incorrect, but seemed easy to remember
// 3: Correct, significant effort
// 4: Correct, hesitation
// 5: Correct, perfect

export function calculateSM2(quality: number, person: Person): Person {
  let { repetition, interval, easeFactor } = person;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition++;
  } else {
    repetition = 0;
    interval = 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // Set next review date to start of day for the calculated interval
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  nextReviewDate.setHours(0, 0, 0, 0);

  return {
    ...person,
    repetition,
    interval,
    easeFactor,
    nextReviewDate: nextReviewDate.getTime(),
  };
}
