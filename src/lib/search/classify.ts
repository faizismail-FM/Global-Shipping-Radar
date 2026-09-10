import { looksLikeContainerNumber, normalizeContainerNumber } from '@/lib/identifiers';

export type QueryKind = 'container' | 'imo' | 'mmsi' | 'text';

export interface ClassifiedQuery {
  kind: QueryKind;
  raw: string;
  /** Normalised value (upper-cased container number, digits-only IMO/MMSI, trimmed text). */
  value: string;
}

/**
 * Smart query classification for the global search box.
 * - "MSBU5471161"      → container number (ISO 6346 shape)
 * - "IMO 9876543" / 7 digits → IMO number
 * - 9 digits          → MMSI
 * - anything else     → free text (vessel / port / operator / location)
 */
export function classifyQuery(raw: string): ClassifiedQuery {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  const imoMatch = upper.match(/^IMO[\s:-]*(\d{7})$/);
  if (imoMatch) return { kind: 'imo', raw: trimmed, value: imoMatch[1] as string };
  if (/^\d{7}$/.test(trimmed)) return { kind: 'imo', raw: trimmed, value: trimmed };
  if (/^(MMSI[\s:-]*)?\d{9}$/i.test(trimmed)) return { kind: 'mmsi', raw: trimmed, value: trimmed.replace(/\D/g, '') };
  if (looksLikeContainerNumber(trimmed)) return { kind: 'container', raw: trimmed, value: normalizeContainerNumber(trimmed) };
  return { kind: 'text', raw: trimmed, value: trimmed };
}
