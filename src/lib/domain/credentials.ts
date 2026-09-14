const LOGIN_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function randomInt(max: number) {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0]! % max;
}

export function generatePassword(length = 10) {
  let out = "";
  for (let i = 0; i < length; i++) out += LOGIN_ALPHABET[randomInt(LOGIN_ALPHABET.length)];
  return out;
}

export function generatePin() {
  return String(randomInt(10000)).padStart(4, "0");
}

export function formatHandoff(input: { name: string; login: string; password: string; pin: string; roleLabel: string }) {
  return [
    `Имя: ${input.name}`,
    `Роль: ${input.roleLabel}`,
    `Логин: ${input.login}`,
    `Пароль: ${input.password}`,
    `PIN: ${input.pin}`,
  ].join("\n");
}
