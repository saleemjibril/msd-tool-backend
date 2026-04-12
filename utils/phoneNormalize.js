/**
 * Normalize phone for lookup (Nigeria-friendly: leading 0 → 234).
 */
export function normalizePhone(input) {
  if (input == null || typeof input !== "string") return "";
  let d = input.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0") && d.length === 11) d = `234${d.slice(1)}`;
  if (d.startsWith("234")) return d;
  if (d.length === 10) return `234${d}`;
  return d;
}
