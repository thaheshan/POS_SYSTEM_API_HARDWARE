/**
 * Generate QUO number with format: QUO-${year}-${padded(seq)}
 * Sequence resets each year
 */
export function generateQuoNumber(year: number, sequence: number): string {
  const paddedSeq = String(sequence).padStart(5, '0');
  return `QUO-${year}-${paddedSeq}`;
}

/**
 * Extract sequence number from QUO number
 * e.g., QUO-2026-00001 → 1
 */
export function extractSequenceFromQuo(quoNumber: string): number {
  const parts = quoNumber.split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid QUO number format');
  }
  return parseInt(parts[2], 10);
}

/**
 * Extract year from QUO number
 * e.g., QUO-2026-00001 → 2026
 */
export function extractYearFromQuo(quoNumber: string): number {
  const parts = quoNumber.split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid QUO number format');
  }
  return parseInt(parts[1], 10);
}
