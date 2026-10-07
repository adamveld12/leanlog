// Failures the app anticipates (a locked day, a missing row, invalid input). They are
// shown to the user and are not bugs, so they aren't written to the error log.
export class DomainError extends Error {}

export class PastDayLockedError extends DomainError {
  constructor(date: string, today: string) {
    super(`Day ${date} is locked (today is ${today})`);
    this.name = 'PastDayLockedError';
  }
}

export class NotFoundError extends DomainError {
  constructor(what: string, id: string) {
    super(`${what} ${id} not found`);
    this.name = 'NotFoundError';
  }
}

class FutureDayError extends DomainError {
  constructor(date: string, today: string) {
    super(`Day ${date} is in the future (today is ${today})`);
    this.name = 'FutureDayError';
  }
}

// Only today is editable (R4). Past days are locked; future days don't exist yet.
export function assertEditableDay(date: string, today: string): void {
  if (date < today) throw new PastDayLockedError(date, today);
  if (date > today) throw new FutureDayError(date, today);
}
