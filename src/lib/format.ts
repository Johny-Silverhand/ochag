const rubFmt = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const rubExact = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

export function rub(value: number, exact = false) {
  return (exact ? rubExact : rubFmt).format(Math.round(exact ? value * 100 : value) / (exact ? 100 : 1));
}

export function qty(value: number, unit?: string) {
  const n = numFmt.format(Number(value.toFixed(2)));
  return unit ? `${n} ${unit}` : n;
}

export function pct(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function ruDate(iso: string, opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Date(iso).toLocaleDateString("ru-RU", opt);
}

export function ruDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ruWeekday(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { weekday: "short" });
}

export function isoDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDay(isoDayStr: string) {
  const [y, m, d] = isoDayStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(isoDayStr: string, n: number) {
  const d = parseDay(isoDayStr);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

export function signedRub(value: number) {
  const abs = rub(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}
