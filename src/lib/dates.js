// Parse a stored "YYYY-MM-DD" date as a LOCAL calendar date.
// new Date("2026-10-01") is UTC midnight, which in US time zones is still Sep 30,
// so month totals and displayed dates came out one day early.
export function parseLocalDate(value) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}