export const formatInt = (n: number): string => Math.round(n).toLocaleString('en-US');

// Typographic minus so a negative number reads as a subtraction.
export const formatSigned = (n: number, digits = 0): string => {
  const abs = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return n < 0 ? `−${abs}` : `+${abs}`;
};

export const formatNegative = (n: number): string => (n < 0 ? `−${formatInt(-n)}` : formatInt(n));
