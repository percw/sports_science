export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function formatScore(value: number, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0";
}
