const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const base36Encode = (num: number): string => {
  if (num === 0) return BASE36[0];

  let encoded = '';
  const base = BASE36.length;

  while (num > 0) {
    const rem = num % base;
    encoded = BASE36[rem] + encoded;
    num = Math.floor(num / base);
  }

  return encoded;
};
