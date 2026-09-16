import type { DistanceUnit, SpeedUnit } from '@/types';
import { NM_TO_KM } from '@/lib/geo';

const numberFormatter = new Intl.NumberFormat('en-US');

export function formatNumber(n: number): string {
  return numberFormatter.format(Math.round(n));
}

export function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return formatNumber(n);
}

export function formatSpeed(knots: number, unit: SpeedUnit = 'kn', digits = 1): string {
  if (unit === 'kmh') return `${(knots * NM_TO_KM).toFixed(digits)} km/h`;
  return `${knots.toFixed(digits)} kn`;
}

export function formatDistance(nm: number, unit: DistanceUnit = 'nm'): string {
  if (unit === 'km') return `${formatNumber(nm * NM_TO_KM)} km`;
  return `${formatNumber(nm)} nm`;
}

export function formatHeading(deg: number): string {
  return `${Math.round(deg).toString().padStart(3, '0')}°`;
}

export function formatTeu(teu: number): string {
  return `${formatNumber(teu)} TEU`;
}

const DATE_SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const DATE_LONG = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Parse loosely; live AIS records may carry empty or unreported timestamps. */
function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateShort(iso: string | number | Date | null | undefined): string {
  const d = toDate(iso);
  return d ? DATE_SHORT.format(d) : '—';
}

export function formatDateLong(iso: string | number | Date | null | undefined): string {
  const d = toDate(iso);
  return d ? DATE_LONG.format(d) : '—';
}

export function formatDateTime(iso: string | number | Date | null | undefined): string {
  const d = toDate(iso);
  return d ? DATE_TIME.format(d) : '—';
}

export function formatTime(iso: string | number | Date | null | undefined): string {
  const d = toDate(iso);
  return d ? TIME.format(d) : '—';
}

export function formatRelative(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, Math.round((now - timestamp) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff} sec ago`;
  const min = Math.floor(diff / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} d ago`;
}

export function formatDurationHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours - days * 24);
  return rem > 0 ? `${days} d ${rem} h` : `${days} d`;
}

export function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

/** Convert an ISO 3166 alpha-2 code to a flag emoji. */
export function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/i.test(code)) return '🏳️';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
