/**
 * Carrier detection from the ISO 6346 owner code (the first four letters of a
 * container number, registered with the BIC) and deep links to each carrier's
 * public tracking page. Needs no credentials and works for every line,
 * including those without a public API (MSC).
 *
 * Caveat: the owner code identifies the container's owner, which for leased
 * boxes is a leasing company, not the carrier. Those are listed in LESSORS so
 * the UI can say so and let the user pick the carrier from the booking.
 */

export interface CarrierSite {
  id: string;
  name: string;
  /** Owner prefixes operated by this carrier (BIC codes). */
  prefixes: readonly string[];
  /** Public tracking page for a container number. Not every site reads the number from the URL; the UI copies it to the clipboard too. */
  trackUrl: (containerNumber: string) => string;
  /** True when the URL is known to pre-fill or run the search. */
  deepLink: boolean;
  /** Parent group whose lines share equipment (e.g. OOCL boxes are often COSCO-owned and vice versa). */
  group?: string;
}

const enc = encodeURIComponent;

export const CARRIER_SITES: readonly CarrierSite[] = [
  // Global lines
  { id: 'msc', name: 'MSC', prefixes: ['MSCU', 'MEDU', 'MSDU', 'MSMU', 'MSNU', 'MSZU', 'MSBU'], trackUrl: (n) => `https://www.msc.com/en/track-a-shipment?trackingNumber=${enc(n)}&trackingMode=0`, deepLink: true },
  { id: 'maersk', name: 'Maersk', prefixes: ['MAEU', 'MRKU', 'MSKU', 'MRSU', 'MNBU', 'MMAU', 'MCAU', 'MWCU', 'MSWU', 'MIEU', 'PONU', 'SUDU', 'SEAU'], trackUrl: (n) => `https://www.maersk.com/tracking/${enc(n)}`, deepLink: true },
  { id: 'cma-cgm', name: 'CMA CGM', prefixes: ['CMAU', 'CGMU', 'ECMU'], trackUrl: (n) => `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference=${enc(n)}`, deepLink: true },
  { id: 'apl', name: 'APL', prefixes: ['APLU', 'APZU', 'APHU', 'APRU'], trackUrl: (n) => `https://www.apl.com/ebusiness/tracking/search?SearchBy=Container&Reference=${enc(n)}`, deepLink: true, group: 'cma-cgm' },
  { id: 'anl', name: 'ANL', prefixes: ['ANNU'], trackUrl: (n) => `https://www.anl.com.au/ebusiness/tracking/search?SearchBy=Container&Reference=${enc(n)}`, deepLink: true, group: 'cma-cgm' },
  { id: 'hapag-lloyd', name: 'Hapag-Lloyd', prefixes: ['HLCU', 'HLXU', 'HLBU', 'UACU'], trackUrl: (n) => `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${enc(n)}`, deepLink: true },
  { id: 'one', name: 'ONE', prefixes: ['ONEU', 'NYKU', 'MOLU', 'MOFU', 'MOAU', 'MOTU', 'KKFU', 'KKTU', 'KKLU'], trackUrl: (n) => `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?ctrack-field=${enc(n)}&trakNoParam=${enc(n)}`, deepLink: true },
  { id: 'evergreen', name: 'Evergreen', prefixes: ['EGHU', 'EMCU', 'EGSU', 'EISU', 'EITU'], trackUrl: () => 'https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do', deepLink: false },
  { id: 'cosco', name: 'COSCO Shipping', prefixes: ['CSNU', 'CCLU', 'CBHU', 'COSU', 'CSLU', 'CSGU'], trackUrl: (n) => `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=CONTAINER&number=${enc(n)}`, deepLink: true },
  { id: 'oocl', name: 'OOCL', prefixes: ['OOLU', 'OOCU'], trackUrl: () => 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx', deepLink: false, group: 'cosco' },
  { id: 'yang-ming', name: 'Yang Ming', prefixes: ['YMLU', 'YMMU'], trackUrl: () => 'https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx', deepLink: false },
  { id: 'hmm', name: 'HMM', prefixes: ['HMMU', 'HDMU'], trackUrl: () => 'https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do', deepLink: false },
  { id: 'zim', name: 'ZIM', prefixes: ['ZIMU', 'ZCSU'], trackUrl: (n) => `https://www.zim.com/tools/track-a-shipment?consnumber=${enc(n)}`, deepLink: true },
  { id: 'pil', name: 'PIL', prefixes: ['PCIU', 'PIDU'], trackUrl: () => 'https://www.pilship.com/', deepLink: false },
  { id: 'wan-hai', name: 'Wan Hai', prefixes: ['WHLU', 'WHSU'], trackUrl: () => 'https://www.wanhai.com/views/cargoTrack/CargoTrack.xhtml', deepLink: false },
  // Intra-Asia lines (FM Global Logistics' main carriers)
  { id: 'interasia', name: 'Interasia Lines', prefixes: ['IAAU'], trackUrl: () => 'https://www.interasia.cc/', deepLink: false },
  { id: 'rcl', name: 'RCL', prefixes: ['REGU', 'CIPU', 'OCGU'], trackUrl: () => 'https://www.rclgroup.com/', deepLink: false },
  { id: 'kmtc', name: 'KMTC', prefixes: ['KMTU'], trackUrl: () => 'https://www.ekmtc.com/index.html#/cargo-tracking', deepLink: false },
  { id: 'sinokor', name: 'Sinokor / Heung-A', prefixes: ['SKHU', 'SKLU', 'HALU'], trackUrl: () => 'https://www.sinokor.co.kr/en/', deepLink: false },
  { id: 'sitc', name: 'SITC', prefixes: ['SITU'], trackUrl: () => 'https://www.sitcline.com/', deepLink: false },
  { id: 'ts-lines', name: 'TS Lines', prefixes: ['TSSU', 'TSLU'], trackUrl: () => 'https://www.tslines.com/en/tracking', deepLink: false },
  { id: 'transworld', name: 'Transworld', prefixes: ['BLZU'], trackUrl: () => 'https://www.transworld.com/', deepLink: false },
  { id: 'mtt', name: 'MTT Shipping', prefixes: ['MTMU'], trackUrl: () => 'https://www.mtt2u.com/web/tracking', deepLink: false },
  { id: 'econship', name: 'Econship', prefixes: ['ECNU'], trackUrl: () => 'https://www.econshipping.com/', deepLink: false },
  { id: 'goodrich', name: 'Goodrich', prefixes: ['GRMU'], trackUrl: () => 'https://goodrichlogistics.com/', deepLink: false },
  { id: 'unifeeder', name: 'Unifeeder', prefixes: ['DPWU'], trackUrl: () => 'https://www.unifeeder.com/', deepLink: false },
  { id: 'emirates', name: 'Emirates Shipping Line', prefixes: [], trackUrl: () => 'https://www.emiratesline.com/', deepLink: false },
  { id: 'swire', name: 'Swire Shipping', prefixes: ['CHVU'], trackUrl: () => 'https://www.swireshipping.com/', deepLink: false },
  { id: 'arkas', name: 'Arkas Line', prefixes: ['ARKU'], trackUrl: () => 'https://webtracking.arkasline.com.tr/shipmenttracking', deepLink: false },
];

/** Container leasing companies: the carrier cannot be inferred from these prefixes. */
export const LESSORS: Readonly<Record<string, string>> = {
  TRLU: 'Triton', TRHU: 'Triton', TRIU: 'Triton', TTNU: 'Triton', TCLU: 'Triton', TCNU: 'Triton', TCKU: 'Triton',
  TGHU: 'Textainer', TGBU: 'Textainer', TGCU: 'Textainer', TEMU: 'Textainer',
  FCIU: 'Florens', FSCU: 'Florens', FBIU: 'Florens', FFAU: 'Florens',
  CAIU: 'CAI International', CAXU: 'CAI International',
  SEGU: 'Seaco', GESU: 'Seaco', GLDU: 'Seaco',
  BMOU: 'Beacon Intermodal', BEAU: 'Beacon Intermodal',
  CRXU: 'Cronos', CRSU: 'Cronos',
  SCZU: 'SeaCube', DFSU: 'Dong Fang International', TLLU: 'Touax', BSIU: 'Blue Sky Intermodal', UETU: 'UES International', DRYU: 'Dry Box', CXDU: 'CXIC', GCXU: 'Gold Container',
};

export type OwnerDetection =
  | { kind: 'carrier'; prefix: string; site: CarrierSite }
  | { kind: 'lessor'; prefix: string; lessor: string }
  | { kind: 'unknown'; prefix: string };

export function detectOwner(containerNumber: string): OwnerDetection {
  const prefix = containerNumber.toUpperCase().replace(/\s|-/g, '').slice(0, 4);
  const site = CARRIER_SITES.find((c) => c.prefixes.includes(prefix));
  if (site) return { kind: 'carrier', prefix, site };
  const lessor = LESSORS[prefix];
  if (lessor) return { kind: 'lessor', prefix, lessor };
  return { kind: 'unknown', prefix };
}

export function carrierSiteById(id: string): CarrierSite | undefined {
  return CARRIER_SITES.find((c) => c.id === id);
}

/** Match a carrier name as it appears in tracking records ("Maersk", "Hapag-Lloyd", "CMA CGM"…) to a site. */
export function carrierSiteByName(name: string): CarrierSite | undefined {
  const n = name.trim().toLowerCase();
  return CARRIER_SITES.find((c) => c.name.toLowerCase() === n || c.id === n.replace(/\s+/g, '-'));
}

/** Public BIC register entry for an owner code. */
export function bicLookupUrl(prefix: string): string {
  return `https://www.bic-code.org/bic-codes/${prefix.toLowerCase()}/`;
}

/** FM's own history for a prefix: which carriers its containers actually sailed with. */
export interface PrefixHistory {
  samples: number;
  carriers: { carrier: string; share: number }[];
}

export interface CarrierSuggestion {
  site: CarrierSite | null;
  /** How the suggestion was made. */
  basis: 'record' | 'owner' | 'owner+history' | 'history' | 'none';
  /** Share of FM's past containers with this prefix that used the suggested carrier (when history was used). */
  share?: number;
  samples?: number;
  /** Other carriers FM has used for this prefix, most common first. */
  alternatives: { site: CarrierSite; share: number }[];
  owner: OwnerDetection;
}

/**
 * Pick the carrier to pre-select for a container number.
 *
 * 1. A carrier named on the tracking record wins.
 * 2. A carrier-owned prefix is used as is, unless FM's history shows the boxes
 *    mostly sail with another line of the same group (COSCO-owned boxes on
 *    OOCL bookings), in which case history wins.
 * 3. Leased or unknown prefixes fall back to FM's history, if any.
 */
export function suggestCarrier(containerNumber: string, history: Readonly<Record<string, PrefixHistory>>, knownCarrier?: string): CarrierSuggestion {
  const owner = detectOwner(containerNumber);
  const h = history[owner.prefix];
  const ranked = (h?.carriers ?? [])
    .filter((c) => c.share >= 0.05)
    .map((c) => ({ site: carrierSiteById(c.carrier), share: c.share }))
    .filter((c): c is { site: CarrierSite; share: number } => c.site !== undefined);
  const alternatives = (chosen: CarrierSite | null) => ranked.filter((c) => c.site.id !== chosen?.id);

  const fromRecord = knownCarrier ? carrierSiteByName(knownCarrier) : undefined;
  if (fromRecord) return { site: fromRecord, basis: 'record', alternatives: alternatives(fromRecord), owner };

  if (owner.kind === 'carrier') {
    const top = ranked[0];
    const sameGroup = top && top.site.id !== owner.site.id && (top.site.group === owner.site.id || owner.site.group === top.site.id || (top.site.group !== undefined && top.site.group === owner.site.group));
    if (top && sameGroup && top.share >= 0.5 && h) {
      return { site: top.site, basis: 'owner+history', share: top.share, samples: h.samples, alternatives: alternatives(top.site), owner };
    }
    return { site: owner.site, basis: 'owner', alternatives: alternatives(owner.site), owner };
  }
  const top = ranked[0];
  if (top && h) return { site: top.site, basis: 'history', share: top.share, samples: h.samples, alternatives: alternatives(top.site), owner };
  return { site: null, basis: 'none', alternatives: [], owner };
}
