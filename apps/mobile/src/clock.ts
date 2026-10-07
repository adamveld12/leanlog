// The app's notion of "now". A module of its own so tests can pin the date.
export const now = (): Date => new Date();
