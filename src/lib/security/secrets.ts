/** Compare secrets without leaking length via early string ===. Works in Node and the browser. */
export function secretsEqual(left: string, right: string) {
  const a = String(left);
  const b = String(right);
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
