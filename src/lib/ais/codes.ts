import type { VesselStatus, VesselType } from '@/types';

/**
 * AIS decoding helpers shared by live data sources.
 */

/** Maritime Identification Digits (first three digits of an MMSI) → flag. Common maritime nations only. */
const MID: Record<string, [string, string]> = {
  201: ['Albania', 'AL'], 203: ['Austria', 'AT'], 205: ['Belgium', 'BE'], 209: ['Cyprus', 'CY'], 210: ['Cyprus', 'CY'], 211: ['Germany', 'DE'],
  212: ['Cyprus', 'CY'], 215: ['Malta', 'MT'], 218: ['Germany', 'DE'], 219: ['Denmark', 'DK'], 220: ['Denmark', 'DK'], 224: ['Spain', 'ES'],
  225: ['Spain', 'ES'], 226: ['France', 'FR'], 227: ['France', 'FR'], 228: ['France', 'FR'], 229: ['Malta', 'MT'], 230: ['Finland', 'FI'],
  231: ['Faroe Islands', 'FO'], 232: ['United Kingdom', 'GB'], 233: ['United Kingdom', 'GB'], 234: ['United Kingdom', 'GB'], 235: ['United Kingdom', 'GB'],
  236: ['Gibraltar', 'GI'], 237: ['Greece', 'GR'], 238: ['Croatia', 'HR'], 239: ['Greece', 'GR'], 240: ['Greece', 'GR'], 241: ['Greece', 'GR'],
  242: ['Morocco', 'MA'], 243: ['Hungary', 'HU'], 244: ['Netherlands', 'NL'], 245: ['Netherlands', 'NL'], 246: ['Netherlands', 'NL'], 247: ['Italy', 'IT'],
  248: ['Malta', 'MT'], 249: ['Malta', 'MT'], 250: ['Ireland', 'IE'], 251: ['Iceland', 'IS'], 252: ['Liechtenstein', 'LI'], 253: ['Luxembourg', 'LU'],
  255: ['Portugal', 'PT'], 256: ['Malta', 'MT'], 257: ['Norway', 'NO'], 258: ['Norway', 'NO'], 259: ['Norway', 'NO'], 261: ['Poland', 'PL'],
  263: ['Portugal', 'PT'], 264: ['Romania', 'RO'], 265: ['Sweden', 'SE'], 266: ['Sweden', 'SE'], 267: ['Slovakia', 'SK'], 268: ['San Marino', 'SM'],
  269: ['Switzerland', 'CH'], 270: ['Czechia', 'CZ'], 271: ['Türkiye', 'TR'], 272: ['Ukraine', 'UA'], 273: ['Russia', 'RU'], 274: ['North Macedonia', 'MK'],
  275: ['Latvia', 'LV'], 276: ['Estonia', 'EE'], 277: ['Lithuania', 'LT'], 278: ['Slovenia', 'SI'], 279: ['Serbia', 'RS'], 301: ['Anguilla', 'AI'],
  303: ['United States', 'US'], 304: ['Antigua and Barbuda', 'AG'], 305: ['Antigua and Barbuda', 'AG'], 306: ['Curaçao', 'CW'], 308: ['Bahamas', 'BS'],
  309: ['Bahamas', 'BS'], 311: ['Bahamas', 'BS'], 312: ['Belize', 'BZ'], 314: ['Barbados', 'BB'], 316: ['Canada', 'CA'], 319: ['Cayman Islands', 'KY'],
  321: ['Costa Rica', 'CR'], 323: ['Cuba', 'CU'], 325: ['Dominica', 'DM'], 327: ['Dominican Republic', 'DO'], 329: ['Guadeloupe', 'GP'],
  330: ['Grenada', 'GD'], 331: ['Greenland', 'GL'], 332: ['Guatemala', 'GT'], 334: ['Honduras', 'HN'], 336: ['Haiti', 'HT'], 338: ['United States', 'US'],
  339: ['Jamaica', 'JM'], 341: ['Saint Kitts and Nevis', 'KN'], 343: ['Saint Lucia', 'LC'], 345: ['Mexico', 'MX'], 347: ['Martinique', 'MQ'],
  348: ['Montserrat', 'MS'], 350: ['Nicaragua', 'NI'], 351: ['Panama', 'PA'], 352: ['Panama', 'PA'], 353: ['Panama', 'PA'], 354: ['Panama', 'PA'],
  355: ['Panama', 'PA'], 356: ['Panama', 'PA'], 357: ['Panama', 'PA'], 358: ['Puerto Rico', 'PR'], 359: ['El Salvador', 'SV'], 361: ['Saint Pierre and Miquelon', 'PM'],
  362: ['Trinidad and Tobago', 'TT'], 364: ['Turks and Caicos', 'TC'], 366: ['United States', 'US'], 367: ['United States', 'US'], 368: ['United States', 'US'],
  369: ['United States', 'US'], 370: ['Panama', 'PA'], 371: ['Panama', 'PA'], 372: ['Panama', 'PA'], 373: ['Panama', 'PA'], 374: ['Panama', 'PA'],
  375: ['Saint Vincent and the Grenadines', 'VC'], 376: ['Saint Vincent and the Grenadines', 'VC'], 377: ['Saint Vincent and the Grenadines', 'VC'],
  378: ['British Virgin Islands', 'VG'], 379: ['US Virgin Islands', 'VI'], 401: ['Afghanistan', 'AF'], 403: ['Saudi Arabia', 'SA'], 405: ['Bangladesh', 'BD'],
  408: ['Bahrain', 'BH'], 410: ['Bhutan', 'BT'], 412: ['China', 'CN'], 413: ['China', 'CN'], 414: ['China', 'CN'], 416: ['Taiwan', 'TW'], 417: ['Sri Lanka', 'LK'],
  419: ['India', 'IN'], 422: ['Iran', 'IR'], 423: ['Azerbaijan', 'AZ'], 425: ['Iraq', 'IQ'], 428: ['Israel', 'IL'], 431: ['Japan', 'JP'], 432: ['Japan', 'JP'],
  434: ['Turkmenistan', 'TM'], 436: ['Kazakhstan', 'KZ'], 437: ['Uzbekistan', 'UZ'], 438: ['Jordan', 'JO'], 440: ['South Korea', 'KR'], 441: ['South Korea', 'KR'],
  443: ['Palestine', 'PS'], 445: ['North Korea', 'KP'], 447: ['Kuwait', 'KW'], 450: ['Lebanon', 'LB'], 451: ['Kyrgyzstan', 'KG'], 453: ['Macao', 'MO'],
  455: ['Maldives', 'MV'], 457: ['Mongolia', 'MN'], 459: ['Nepal', 'NP'], 461: ['Oman', 'OM'], 463: ['Pakistan', 'PK'], 466: ['Qatar', 'QA'], 468: ['Syria', 'SY'],
  470: ['United Arab Emirates', 'AE'], 471: ['United Arab Emirates', 'AE'], 472: ['Tajikistan', 'TJ'], 473: ['Yemen', 'YE'], 475: ['Yemen', 'YE'], 477: ['Hong Kong', 'HK'],
  478: ['Bosnia and Herzegovina', 'BA'], 501: ['Antarctica', 'AQ'], 503: ['Australia', 'AU'], 506: ['Myanmar', 'MM'], 508: ['Brunei', 'BN'], 510: ['Micronesia', 'FM'],
  511: ['Palau', 'PW'], 512: ['New Zealand', 'NZ'], 514: ['Cambodia', 'KH'], 515: ['Cambodia', 'KH'], 516: ['Christmas Island', 'CX'], 518: ['Cook Islands', 'CK'],
  520: ['Fiji', 'FJ'], 523: ['Cocos Islands', 'CC'], 525: ['Indonesia', 'ID'], 529: ['Kiribati', 'KI'], 531: ['Laos', 'LA'], 533: ['Malaysia', 'MY'],
  536: ['Northern Mariana Islands', 'MP'], 538: ['Marshall Islands', 'MH'], 540: ['New Caledonia', 'NC'], 542: ['Niue', 'NU'], 544: ['Nauru', 'NR'],
  546: ['French Polynesia', 'PF'], 548: ['Philippines', 'PH'], 550: ['Timor-Leste', 'TL'], 553: ['Papua New Guinea', 'PG'], 555: ['Pitcairn', 'PN'],
  557: ['Solomon Islands', 'SB'], 559: ['American Samoa', 'AS'], 561: ['Samoa', 'WS'], 563: ['Singapore', 'SG'], 564: ['Singapore', 'SG'], 565: ['Singapore', 'SG'],
  566: ['Singapore', 'SG'], 567: ['Thailand', 'TH'], 570: ['Tonga', 'TO'], 572: ['Tuvalu', 'TV'], 574: ['Vietnam', 'VN'], 576: ['Vanuatu', 'VU'],
  577: ['Vanuatu', 'VU'], 578: ['Wallis and Futuna', 'WF'], 601: ['South Africa', 'ZA'], 603: ['Angola', 'AO'], 605: ['Algeria', 'DZ'], 607: ['Saint Paul and Amsterdam Islands', 'TF'],
  608: ['Ascension Island', 'AC'], 609: ['Burundi', 'BI'], 610: ['Benin', 'BJ'], 611: ['Botswana', 'BW'], 612: ['Central African Republic', 'CF'], 613: ['Cameroon', 'CM'],
  615: ['Congo', 'CG'], 616: ['Comoros', 'KM'], 617: ['Cabo Verde', 'CV'], 618: ['Crozet Islands', 'TF'], 619: ['Côte d’Ivoire', 'CI'], 620: ['Comoros', 'KM'],
  621: ['Djibouti', 'DJ'], 622: ['Egypt', 'EG'], 624: ['Ethiopia', 'ET'], 625: ['Eritrea', 'ER'], 626: ['Gabon', 'GA'], 627: ['Ghana', 'GH'], 629: ['Gambia', 'GM'],
  630: ['Guinea-Bissau', 'GW'], 631: ['Equatorial Guinea', 'GQ'], 632: ['Guinea', 'GN'], 633: ['Burkina Faso', 'BF'], 634: ['Kenya', 'KE'], 635: ['Kerguelen Islands', 'TF'],
  636: ['Liberia', 'LR'], 637: ['Liberia', 'LR'], 638: ['South Sudan', 'SS'], 642: ['Libya', 'LY'], 644: ['Lesotho', 'LS'], 645: ['Mauritius', 'MU'],
  647: ['Madagascar', 'MG'], 649: ['Mali', 'ML'], 650: ['Mozambique', 'MZ'], 654: ['Mauritania', 'MR'], 655: ['Malawi', 'MW'], 656: ['Niger', 'NE'],
  657: ['Nigeria', 'NG'], 659: ['Namibia', 'NA'], 660: ['Réunion', 'RE'], 661: ['Rwanda', 'RW'], 662: ['Sudan', 'SD'], 663: ['Senegal', 'SN'],
  664: ['Seychelles', 'SC'], 665: ['Saint Helena', 'SH'], 666: ['Somalia', 'SO'], 667: ['Sierra Leone', 'SL'], 668: ['São Tomé and Príncipe', 'ST'],
  669: ['Eswatini', 'SZ'], 670: ['Chad', 'TD'], 671: ['Togo', 'TG'], 672: ['Tunisia', 'TN'], 674: ['Tanzania', 'TZ'], 675: ['Uganda', 'UG'],
  676: ['DR Congo', 'CD'], 677: ['Tanzania', 'TZ'], 678: ['Zambia', 'ZM'], 679: ['Zimbabwe', 'ZW'], 701: ['Argentina', 'AR'], 710: ['Brazil', 'BR'],
  720: ['Bolivia', 'BO'], 725: ['Chile', 'CL'], 730: ['Colombia', 'CO'], 735: ['Ecuador', 'EC'], 740: ['Falkland Islands', 'FK'], 745: ['French Guiana', 'GF'],
  750: ['Guyana', 'GY'], 755: ['Paraguay', 'PY'], 760: ['Peru', 'PE'], 765: ['Suriname', 'SR'], 770: ['Uruguay', 'UY'], 775: ['Venezuela', 'VE'],
};

export function flagFromMmsi(mmsi: string | number): { flag: string; flagCode: string } {
  const entry = MID[String(mmsi).slice(0, 3)];
  return entry ? { flag: entry[0], flagCode: entry[1] } : { flag: 'Unknown', flagCode: '' };
}

/** AIS ship-type code (message 5) → broad class. Container ships are reported as cargo. */
export function vesselTypeFromAis(code: number | null | undefined): VesselType {
  if (code == null) return 'other';
  if (code >= 70 && code <= 79) return 'cargo';
  if (code >= 80 && code <= 89) return 'tanker';
  if (code >= 60 && code <= 69) return 'passenger';
  return 'other';
}

export function describeAisShipType(code: number | null | undefined): string {
  if (code == null || code === 0) return 'Unspecified';
  if (code >= 70 && code <= 79) return code === 70 ? 'Cargo' : `Cargo (category ${code - 70})`;
  if (code >= 80 && code <= 89) return code === 80 ? 'Tanker' : `Tanker (category ${code - 80})`;
  if (code >= 60 && code <= 69) return 'Passenger';
  const map: Record<number, string> = { 30: 'Fishing', 31: 'Towing', 32: 'Towing (large)', 33: 'Dredging', 34: 'Diving ops', 35: 'Military', 36: 'Sailing', 37: 'Pleasure craft', 40: 'High-speed craft', 50: 'Pilot vessel', 51: 'Search and rescue', 52: 'Tug', 53: 'Port tender', 54: 'Anti-pollution', 55: 'Law enforcement', 58: 'Medical transport', 90: 'Other' };
  if (code >= 40 && code <= 49) return 'High-speed craft';
  return map[code] ?? `Type ${code}`;
}

/**
 * Navigational status (AIS message 1/2/3) → dashboard status.
 * 0 under way using engine · 1 at anchor · 2 not under command · 3 restricted manoeuvrability ·
 * 4 constrained by draught · 5 moored · 6 aground · 7 fishing · 8 under way sailing · 15 undefined
 */
export function statusFromNav(navStat: number | null | undefined, sog: number): VesselStatus {
  switch (navStat) {
    case 0:
    case 8:
      return sog >= 0.5 ? 'underway' : 'anchored';
    case 1:
      return 'anchored';
    case 5:
      return 'moored';
    case 2:
    case 3:
    case 4:
    case 6:
    case 7:
      return sog >= 1 ? 'underway' : 'anchored';
    default:
      return sog >= 1 ? 'underway' : 'moored';
  }
}

/**
 * AIS ETA is packed as MMDDHHMM (month 4 bits, day 5, hour 5, minute 6). Values of
 * 0 / 24 / 60 mean "not available". Returns an ISO timestamp or null.
 */
export function decodeAisEta(packed: number | null | undefined, now = Date.now()): string | null {
  if (packed == null || packed <= 0) return null;
  const month = (packed >> 16) & 0x0f;
  const day = (packed >> 11) & 0x1f;
  const hour = (packed >> 6) & 0x1f;
  const minute = packed & 0x3f;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const h = hour >= 24 ? 0 : hour;
  const m = minute >= 60 ? 0 : minute;
  const ref = new Date(now);
  let eta = new Date(Date.UTC(ref.getUTCFullYear(), month - 1, day, h, m));
  // ETAs more than ~1 month in the past most likely refer to next year.
  if (eta.getTime() < now - 30 * 86_400_000) eta = new Date(Date.UTC(ref.getUTCFullYear() + 1, month - 1, day, h, m));
  return Number.isNaN(eta.getTime()) ? null : eta.toISOString();
}

/** Tidy a free-text AIS destination field ("DEHAM>FIKOK", "SE VBY", "rauma"). */
export function cleanAisDestination(raw: string | null | undefined, resolve: (locodeOrName: string) => string | null): string {
  if (!raw) return '';
  let s = raw.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!s) return '';
  if (s.includes('>')) s = (s.split('>').pop() ?? s).trim();
  // "FIHEL VIA NOK" = Helsinki via the Kiel Canal: the destination is the part before VIA.
  if (s.includes(' VIA ')) s = (s.split(' VIA ')[0] ?? s).trim();
  const compact = s.replace(/[^A-Z]/g, '');
  const viaLocode = compact.length === 5 ? resolve(compact) : null;
  if (viaLocode) return viaLocode;
  // "FI HEL" style with a space after the country code.
  const spaced = s.match(/^([A-Z]{2}) ([A-Z]{3})$/);
  if (spaced) {
    const r = resolve(`${spaced[1]}${spaced[2]}`);
    if (r) return r;
  }
  const viaName = resolve(s);
  if (viaName) return viaName;
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
