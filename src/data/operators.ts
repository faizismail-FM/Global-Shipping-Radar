export interface Operator {
  name: string;
  short: string;
  /** Vessel names in this operator's fleet naming style. */
  vessels: string[];
  /** Registered flags [country, ISO code]. */
  flags: [string, string][];
  /** ISO 6346 container owner prefixes. */
  containerPrefixes: string[];
  /** Typical TEU range. */
  teu: [number, number];
}

export const OPERATORS: Operator[] = [
  {
    name: 'Evergreen Marine',
    short: 'Evergreen',
    flags: [['Panama', 'PA'], ['Taiwan', 'TW'], ['United Kingdom', 'GB']],
    containerPrefixes: ['EGHU', 'EMCU', 'EISU'],
    teu: [8000, 24000],
    vessels: ['EVER ACE', 'EVER GIVEN', 'EVER ALOT', 'EVER ART', 'EVER APEX', 'EVER ARM', 'EVER ATOP', 'EVER GLORY', 'EVER GOLDEN', 'EVER LUCKY', 'EVER LIVEN', 'EVER LEGACY', 'EVER LAMBENT', 'EVER FAIR', 'EVER FOCUS', 'EVER FRONT', 'EVER FULL', 'EVER GENTLE', 'EVER GIFTED', 'EVER GREET', 'EVER BLISS', 'EVER BOOMY', 'EVER BRACE', 'EVER CANDID', 'EVER CAREER', 'EVER CENTER', 'EVER FORWARD', 'EVER LOTUS', 'EVER LUNAR', 'EVER MAX'],
  },
  {
    name: 'Mediterranean Shipping Company',
    short: 'MSC',
    flags: [['Liberia', 'LR'], ['Panama', 'PA'], ['Malta', 'MT']],
    containerPrefixes: ['MSCU', 'MEDU', 'MSBU'],
    teu: [9000, 24300],
    vessels: ['MSC IRINA', 'MSC LORETO', 'MSC TESSA', 'MSC GULSUN', 'MSC MIA', 'MSC ISABELLA', 'MSC SIXIN', 'MSC AMBRA', 'MSC OSCAR', 'MSC ZOE', 'MSC MAYA', 'MSC ELOANE', 'MSC DITTE', 'MSC ANNA', 'MSC VIVIANA', 'MSC FEBE', 'MSC NELA', 'MSC ARINA', 'MSC SAMAR', 'MSC SIYA B', 'MSC RIFAYA', 'MSC LENI', 'MSC MICHEL CAPPELLINI', 'MSC NICOLA MASTRO', 'MSC CELESTINO MARESCA', 'MSC TURKIYE', 'MSC ALLEGRA', 'MSC AMELIA', 'MSC APOLLINE', 'MSC ARIES'],
  },
  {
    name: 'A.P. Moller – Maersk',
    short: 'Maersk',
    flags: [['Denmark', 'DK'], ['Singapore', 'SG'], ['Hong Kong', 'HK']],
    containerPrefixes: ['MAEU', 'MRKU', 'MSKU'],
    teu: [8500, 20500],
    vessels: ['MAERSK SENTOSA', 'MAERSK EDINBURGH', 'MADRID MAERSK', 'MUNICH MAERSK', 'MANCHESTER MAERSK', 'MARSEILLE MAERSK', 'MILAN MAERSK', 'MONACO MAERSK', 'MAERSK ESSEN', 'MAERSK ELBA', 'MAERSK EINDHOVEN', 'MAERSK EMDEN', 'MAERSK EVORA', 'MAERSK HANGZHOU', 'MAERSK HONAM', 'MAERSK HERRERA', 'MAERSK HAMBURG', 'MAERSK HALIFAX', 'MAERSK DENVER', 'MAERSK DETROIT', 'MAERSK KENSINGTON', 'MAERSK KINLOSS', 'MAERSK KOWLOON', 'MAERSK SALTORO', 'MAERSK SEBAROK', 'MAERSK SEMBAWANG', 'MAERSK SERANGOON', 'ANE MAERSK', 'ASTRID MAERSK', 'ANTONIA MAERSK'],
  },
  {
    name: 'CMA CGM Group',
    short: 'CMA CGM',
    flags: [['Malta', 'MT'], ['France', 'FR'], ['United Kingdom', 'GB']],
    containerPrefixes: ['CMAU', 'CGMU', 'ECMU'],
    teu: [9000, 24000],
    vessels: ['CMA CGM MARCO POLO', 'CMA CGM JACQUES SAADE', 'CMA CGM CHAMPS ELYSEES', 'CMA CGM PALAIS ROYAL', 'CMA CGM LOUVRE', 'CMA CGM SORBONNE', 'CMA CGM TROCADERO', 'CMA CGM MONTMARTRE', 'CMA CGM CONCORDE', 'CMA CGM RIVOLI', 'CMA CGM ANTOINE DE SAINT EXUPERY', 'CMA CGM BENJAMIN FRANKLIN', 'CMA CGM KERGUELEN', 'CMA CGM BOUGAINVILLE', 'CMA CGM VASCO DE GAMA', 'CMA CGM ZHENG HE', 'CMA CGM GEORG FORSTER', 'CMA CGM ARCTIC', 'CMA CGM ZEPHYR', 'CMA CGM TENERE', 'CMA CGM ALEXANDER VON HUMBOLDT', 'CMA CGM JULES VERNE', 'CMA CGM AMERIGO VESPUCCI', 'CMA CGM CHRISTOPHE COLOMB', 'CMA CGM LAPEROUSE', 'CMA CGM MAGELLAN', 'CMA CGM CORTE REAL', 'CMA CGM CALLISTO', 'CMA CGM ARGENTINA', 'CMA CGM BRAZIL'],
  },
  {
    name: 'COSCO Shipping Lines',
    short: 'COSCO',
    flags: [['Hong Kong', 'HK'], ['China', 'CN'], ['Panama', 'PA']],
    containerPrefixes: ['CSNU', 'CCLU', 'CBHU'],
    teu: [9000, 21500],
    vessels: ['COSCO SHIPPING UNIVERSE', 'COSCO SHIPPING GALAXY', 'COSCO SHIPPING SOLAR', 'COSCO SHIPPING PLANET', 'COSCO SHIPPING STAR', 'COSCO SHIPPING NEBULA', 'COSCO SHIPPING ARIES', 'COSCO SHIPPING TAURUS', 'COSCO SHIPPING GEMINI', 'COSCO SHIPPING LEO', 'COSCO SHIPPING VIRGO', 'COSCO SHIPPING LIBRA', 'COSCO SHIPPING SCORPIO', 'COSCO SHIPPING SAGITTARIUS', 'COSCO SHIPPING CAPRICORN', 'COSCO SHIPPING AQUARIUS', 'COSCO SHIPPING PISCES', 'COSCO SHIPPING ALPS', 'COSCO SHIPPING ANDES', 'COSCO SHIPPING HIMALAYAS', 'COSCO SHIPPING DENALI', 'COSCO SHIPPING KILIMANJARO', 'COSCO SHIPPING ROSE', 'COSCO SHIPPING PEONY', 'COSCO SHIPPING JASMINE', 'COSCO SHIPPING AZALEA', 'COSCO SHIPPING CAMELLIA', 'COSCO SHIPPING LOTUS', 'COSCO SHIPPING ORCHID', 'COSCO SHIPPING SAKURA'],
  },
  {
    name: 'Orient Overseas Container Line',
    short: 'OOCL',
    flags: [['Hong Kong', 'HK'], ['Panama', 'PA']],
    containerPrefixes: ['OOLU', 'OOCU'],
    teu: [8900, 24200],
    vessels: ['OOCL SPAIN', 'OOCL HONG KONG', 'OOCL GERMANY', 'OOCL JAPAN', 'OOCL UNITED KINGDOM', 'OOCL SCANDINAVIA', 'OOCL INDONESIA', 'OOCL PIRAEUS', 'OOCL FELIXSTOWE', 'OOCL ZEEBRUGGE', 'OOCL TURKIYE', 'OOCL POLAND', 'OOCL SWEDEN', 'OOCL BRUSSELS', 'OOCL BERLIN', 'OOCL CHONGQING', 'OOCL BANGKOK', 'OOCL SINGAPORE', 'OOCL KOREA', 'OOCL TOKYO', 'OOCL EGYPT', 'OOCL FRANCE', 'OOCL BELGIUM', 'OOCL ITALY', 'OOCL SHENZHEN'],
  },
  {
    name: 'Ocean Network Express',
    short: 'ONE',
    flags: [['Japan', 'JP'], ['Panama', 'PA'], ['Singapore', 'SG']],
    containerPrefixes: ['ONEU', 'NYKU', 'MOLU'],
    teu: [8500, 24100],
    vessels: ['ONE INNOVATION', 'ONE INTEGRITY', 'ONE INFINITY', 'ONE INSPIRATION', 'ONE INGENUITY', 'ONE APUS', 'ONE AQUILA', 'ONE COLUMBA', 'ONE CYGNUS', 'ONE GRUS', 'ONE MINATO', 'ONE HAMBURG', 'ONE STORK', 'ONE SWAN', 'ONE OLYMPUS', 'ONE TRADITION', 'ONE TRUST', 'ONE TREASURE', 'ONE TRIUMPH', 'ONE TRIBUTE', 'ONE FRIENDSHIP', 'ONE FREEDOM', 'ONE FRONTIER', 'ONE FRUITION', 'ONE FANTASTIC', 'ONE MAJESTY', 'ONE MARVEL', 'ONE MISSION', 'ONE MODERN', 'ONE MANEUVER'],
  },
  {
    name: 'Hapag-Lloyd',
    short: 'Hapag-Lloyd',
    flags: [['Germany', 'DE'], ['Malta', 'MT'], ['Singapore', 'SG']],
    containerPrefixes: ['HLXU', 'HLBU', 'HLCU'],
    teu: [8700, 23600],
    vessels: ['BERLIN EXPRESS', 'HAMBURG EXPRESS', 'HANOVER EXPRESS', 'AL ZUBARA', 'AFIF', 'ULSAN EXPRESS', 'BRUSSELS EXPRESS', 'TSINGTAO EXPRESS', 'DALIAN EXPRESS', 'BASLE EXPRESS', 'COLOMBO EXPRESS', 'HONG KONG EXPRESS', 'LEVERKUSEN EXPRESS', 'LUDWIGSHAFEN EXPRESS', 'ESSEN EXPRESS', 'FRANKFURT EXPRESS', 'SOFIA EXPRESS', 'NAGOYA EXPRESS', 'YANTIAN EXPRESS', 'VIENNA EXPRESS', 'GENOA EXPRESS', 'TOKYO EXPRESS', 'SEOUL EXPRESS', 'SHANGHAI EXPRESS', 'DUBLIN EXPRESS', 'MADRID EXPRESS', 'ROME EXPRESS', 'OSAKA EXPRESS', 'KOBE EXPRESS', 'CHICAGO EXPRESS'],
  },
  {
    name: 'HMM',
    short: 'HMM',
    flags: [['Panama', 'PA'], ['South Korea', 'KR']],
    containerPrefixes: ['HMMU', 'HDMU'],
    teu: [8600, 24000],
    vessels: ['HMM ALGECIRAS', 'HMM OSLO', 'HMM COPENHAGEN', 'HMM DUBLIN', 'HMM GDANSK', 'HMM HAMBURG', 'HMM HELSINKI', 'HMM LE HAVRE', 'HMM ROTTERDAM', 'HMM SOUTHAMPTON', 'HMM STOCKHOLM', 'HMM ST PETERSBURG', 'HMM NURI', 'HMM GAON', 'HMM GARAM', 'HMM HANBADA', 'HMM HANUL', 'HMM MIR', 'HMM DAON', 'HMM RAON'],
  },
  {
    name: 'Yang Ming Marine Transport',
    short: 'Yang Ming',
    flags: [['Liberia', 'LR'], ['Taiwan', 'TW']],
    containerPrefixes: ['YMLU', 'YMMU'],
    teu: [6500, 14000],
    vessels: ['YM WELCOME', 'YM WELLHEAD', 'YM WELLNESS', 'YM WIND', 'YM WISH', 'YM WITNESS', 'YM WONDERLAND', 'YM WORTH', 'YM WREATH', 'YM TRIUMPH', 'YM TRUTH', 'YM TOTALITY', 'YM TARGET', 'YM TIPTOP', 'YM MUTUALITY', 'YM MOBILITY', 'YM MODERATION', 'YM MANDATE', 'YM WARMTH', 'YM WIDTH'],
  },
  {
    name: 'Wan Hai Lines',
    short: 'Wan Hai',
    flags: [['Singapore', 'SG'], ['Taiwan', 'TW']],
    containerPrefixes: ['WHLU', 'WHSU'],
    teu: [2800, 13000],
    vessels: ['WAN HAI 301', 'WAN HAI 302', 'WAN HAI 305', 'WAN HAI 316', 'WAN HAI 327', 'WAN HAI 505', 'WAN HAI 510', 'WAN HAI 515', 'WAN HAI 613', 'WAN HAI 625', 'WAN HAI 801', 'WAN HAI 805', 'WAN HAI 806', 'WAN HAI A01', 'WAN HAI A06'],
  },
  {
    name: 'ZIM Integrated Shipping',
    short: 'ZIM',
    flags: [['Israel', 'IL'], ['Liberia', 'LR'], ['Malta', 'MT']],
    containerPrefixes: ['ZIMU', 'ZCSU'],
    teu: [7000, 15000],
    vessels: ['ZIM SAMMY OFER', 'ZIM MOUNT EVEREST', 'ZIM MOUNT DENALI', 'ZIM MOUNT KILIMANJARO', 'ZIM MOUNT FUJI', 'ZIM MOUNT RAINIER', 'ZIM MOUNT BLANC', 'ZIM MOUNT OLYMPUS', 'ZIM USA', 'ZIM CANADA', 'ZIM ROTTERDAM', 'ZIM ANTWERP', 'ZIM HAIFA', 'ZIM ATLANTIC', 'ZIM PACIFIC'],
  },
  {
    name: 'Pacific International Lines',
    short: 'PIL',
    flags: [['Singapore', 'SG']],
    containerPrefixes: ['PCIU', 'PILU'],
    teu: [4000, 14000],
    vessels: ['KOTA LEMBAH', 'KOTA LAZIM', 'KOTA LESTARI', 'KOTA LIMA', 'KOTA LAWA', 'KOTA CANTIK', 'KOTA CARUM', 'KOTA CEMPAKA', 'KOTA CEPAT', 'KOTA PEKARANG', 'KOTA PANJANG', 'KOTA PERABU', 'KOTA PERDANA', 'KOTA PURI', 'KOTA PUSAKA'],
  },
];
