import { useState } from 'react';
import { ExternalLink, Copy, Check, Building2 } from 'lucide-react';
import { CARRIER_SITES, bicLookupUrl, carrierSiteById, suggestCarrier, type CarrierSite } from '@/lib/tracking/carrierLinks';
import { PREFIX_HISTORY } from '@/data/prefixHistory';
import { Button, Select } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * "Track on the carrier's website": detects the carrier from the container's
 * owner prefix and opens that carrier's public tracking page in a new tab.
 * Copies the number to the clipboard first, because not every carrier site
 * reads it from the URL. Works for every line, no credentials needed.
 */
export function CarrierLinkCard({ containerNumber, knownCarrier, compact = false, className }: { containerNumber: string; knownCarrier?: string; compact?: boolean; className?: string }) {
  const suggestion = suggestCarrier(containerNumber, PREFIX_HISTORY, knownCarrier);
  const { owner: detected, alternatives } = suggestion;
  const [choice, setChoice] = useState<string>(suggestion.site?.id ?? '');
  const [copied, setCopied] = useState(false);
  const site: CarrierSite | undefined = carrierSiteById(choice);

  const open = async () => {
    if (!site) return;
    try {
      await navigator.clipboard.writeText(containerNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the number is still in the URL where supported */
    }
    window.open(site.trackUrl(containerNumber), '_blank', 'noopener,noreferrer');
  };

  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const ownerText =
    detected.kind === 'carrier'
      ? `Owner code ${detected.prefix} belongs to ${detected.site.name}.`
      : detected.kind === 'lessor'
        ? `Owner code ${detected.prefix} belongs to ${detected.lessor}, a container leasing company, so the carrier cannot be read from the number.`
        : `Owner code ${detected.prefix} is not in the carrier list.`;
  const historyText =
    suggestion.basis === 'history' || suggestion.basis === 'owner+history'
      ? ` In FM's bookings, ${detected.prefix} boxes ${suggestion.basis === 'owner+history' ? 'mostly sailed' : 'most often sailed'} with ${suggestion.site?.name} (${pct(suggestion.share ?? 0)} of ${suggestion.samples})${alternatives.length ? `, then ${alternatives.slice(0, 2).map((a) => `${a.site.name} ${pct(a.share)}`).join(', ')}` : ''}. Confirm against the booking.`
      : '';
  const explanation =
    suggestion.basis === 'record'
      ? `Carrier from the tracking record: ${suggestion.site?.name}.`
      : suggestion.basis === 'none'
        ? `${ownerText} Pick the carrier from the booking or bill of lading.`
        : `${ownerText}${historyText}`;
  const showBic = detected.kind !== 'carrier' && suggestion.basis !== 'record';

  return (
    <div className={cn('rounded-lg border hairline', compact ? 'p-3' : 'p-4', className)} aria-label="Track on carrier website">
      <div className="flex items-start gap-3">
        <div className={cn('flex shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent', compact ? 'h-8 w-8' : 'h-9 w-9')}>
          <Building2 size={compact ? 15 : 17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn('font-medium text-ink', compact ? 'text-[13px]' : 'text-[14px]')}>Track on the carrier's website</div>
          <p className={cn('mt-0.5 leading-relaxed text-muted', compact ? 'text-[11px]' : 'text-[12px]')}>
            {explanation}
            {showBic && (
              <>
                {' '}
                <a href={bicLookupUrl(detected.prefix)} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  BIC register ↗
                </a>
              </>
            )}
          </p>
        </div>
      </div>
      <div className={cn('mt-3 flex flex-wrap items-center gap-2', compact && 'mt-2.5')}>
        <Select
          label="Carrier"
          value={choice}
          onChange={setChoice}
          options={[{ value: '', label: 'Choose carrier…' }, ...CARRIER_SITES.map((c) => ({ value: c.id, label: c.name }))]}
          className="min-w-[150px]"
        />
        <Button variant="primary" size="sm" icon={ExternalLink} disabled={!site} onClick={() => void open()}>
          {site ? `Open ${site.name} tracking` : 'Open tracking'}
        </Button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(containerNumber).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => undefined)}
          className={cn('inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink', copied && 'text-success')}
          aria-label="Copy container number"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Number copied' : 'Copy number'}
        </button>
      </div>
      {alternatives.length > 0 && suggestion.basis !== 'record' && (
        <div className={cn('mt-2 flex flex-wrap items-center gap-1.5 text-faint', compact ? 'text-[10px]' : 'text-[11px]')}>
          <span>Also used:</span>
          {alternatives.slice(0, 3).map((a) => (
            <button key={a.site.id} type="button" onClick={() => setChoice(a.site.id)} className={cn('rounded border hairline px-1.5 py-0.5 text-muted hover:border-accent hover:text-accent', choice === a.site.id && 'border-accent text-accent')}>
              {a.site.name} · {pct(a.share)}
            </button>
          ))}
        </div>
      )}
      {site && !site.deepLink && (
        <p className={cn('mt-2 text-faint', compact ? 'text-[10px]' : 'text-[11px]')}>{site.name}'s page does not accept the number in the link. It is copied to your clipboard when you open the page; paste it into the tracking box.</p>
      )}
    </div>
  );
}
