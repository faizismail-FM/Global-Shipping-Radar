# Global Shipping Radar

A live, interactive global maritime logistics dashboard: a cinematic world map of container vessels moving along the world's major shipping lanes, with vessel search, filters, vessel and port details, routes, statistics, alerts, a live activity feed and container tracking.

> **Simulated data.** The first version runs entirely on a built-in simulation engine. Vessel names and operators are realistic, but every position, voyage, ETA, port statistic, event and container record is generated locally for demonstration. Nothing shown reflects the real-world location of any ship. The UI labels simulated data throughout.

![Global Shipping Radar](docs/screenshot-overview.png)

## Contents

1. [Project overview](#1-project-overview)
2. [Tech stack](#2-tech-stack)
3. [Installation](#3-installation)
4. [Running the app](#4-running-the-app)
5. [How the simulation works](#5-how-the-simulation-works)
6. [Data architecture](#6-data-architecture)
7. [Map configuration](#7-map-configuration)
8. [Environment variables](#8-environment-variables)
9. [Replacing `MockVesselProvider` with a real API](#9-replacing-mockvesselprovider-with-a-real-api)
10. [Adding a container tracking provider](#10-adding-a-container-tracking-provider)
11. [Production deployment](#11-production-deployment)
12. [Keyboard shortcuts](#12-keyboard-shortcuts)
13. [Quality checks](#13-quality-checks)

---

## 1. Project overview

The application is a single-page maritime operations console built around a MapLibre world map.

| Area | What it does |
| --- | --- |
| **Overview (map)** | 320 simulated container vessels rendered as heading-oriented ship markers on 9 major shipping lanes, 60 ports coloured by congestion, subtle lane lines, a traffic heatmap layer, hover tooltips, click-to-open detail panels, route drawing, floating filter / layers / simulation / settings panels and a live activity feed. |
| **Search** | One search box for vessel name, IMO, MMSI, operator, destination, port, maritime location (straits, canals, regions) and container numbers, with smart classification of the query, grouped results, keyboard navigation and fly-to. |
| **Vessels** | Sortable, searchable, filterable, paginated fleet table (responsive card list on phones). Rows focus the map. |
| **Ports** | Port monitoring table with congestion indicators and region filter. Rows open the port panel and zoom the map. |
| **Routes** | Per-lane statistics computed from the live fleet (vessels, average transit, active, delayed) with "view on map" lane highlighting. |
| **Alerts** | High congestion, vessel delay and high traffic alerts derived from the simulation; clicking one moves the map to the location. |
| **Container Tracking** | Dedicated tracking page with a milestone timeline for 24 demo ISO 6346 container numbers (valid check digits). |
| **Voyage Search** | Find vessels sailing between a port pair (scheduled calls or lane transits), by operator or voyage number. |
| **Simulation & Settings** | Pause/resume/step the simulation, change update frequency and time acceleration, switch dark/light theme, map layers, speed and distance units. Preferences persist in `localStorage`. |

Desktop is the primary target; tablet and phone layouts collapse the sidebar into a bottom navigation bar, show detail panels as bottom sheets and use drawers for filters.

## 2. Tech stack

- [Astro](https://astro.build) 7 (static output) with the React integration
- [React](https://react.dev) 19 for the interactive application
- [TypeScript](https://www.typescriptlang.org) in `strictest` mode
- [Tailwind CSS](https://tailwindcss.com) 4 (Vite plugin) with a token-based dark/light theme
- [MapLibre GL JS](https://maplibre.org) 6 for the map (GeoJSON sources, symbol/circle/line/heatmap layers)
- [Lucide](https://lucide.dev) icons
- No backend, no external APIs, no API keys for the MVP

## 3. Installation

Requirements: Node.js 20 or newer (tested on Node 22) and npm.

```bash
git clone <this repository>
cd Global-Shipping-Radar
npm install
cp .env.example .env   # optional – all variables have sensible defaults
```

## 4. Running the app

```bash
npm run dev        # start the dev server on http://localhost:4321
npm run build      # type-check (astro check) and build to ./dist
npm run preview    # serve the production build locally
npm run check      # Astro + TypeScript diagnostics only
npm run test:sim   # headless soak test of the simulation engine (see §13)
npm run data:world # regenerate the offline fallback world outlines
```

## 5. How the simulation works

Everything "live" is driven by `SimulationEngine` (`src/lib/simulation/engine.ts`). It owns an external store that React components subscribe to through a small selector hook (`src/lib/store/createStore.ts`), so no component runs its own interval.

Each **tick** (default every 2 s of wall-clock time, representing 1 simulated hour):

1. **`updateVesselPositions()`** moves every `underway` vessel along its lane. Vessels sail great-circle legs between hand-placed waypoints that follow real sea corridors (Malacca and Singapore Straits, Suez, Bab-el-Mandeb, Gibraltar, the English Channel, Panama, Tokara/Korea Straits, the Cape, Lombok, Bass Strait, …). Distance per tick = speed × simulated hours; heading is the bearing to the next waypoint. Vessels never jump: the map interpolates between ticks with `requestAnimationFrame`, so movement is continuous at any update interval.
2. **Port calls.** Reaching a scheduled call switches the vessel to `moored` (or `anchored` / `delayed` when the port is congested), it dwells for a while, then departs with a fresh voyage number, route and ETA. At the end of a lane the vessel turns around, so the demo runs indefinitely.
3. **Activity events** ("Vessel entered Singapore Strait", "Vessel departed Port Klang", "Port congestion increased", "ETA revised …") are generated from real transitions in the simulation and appended to the 20-item feed.
4. **Port statistics** drift with a mean-reverting random walk every five ticks; congestion level follows average waiting time.
5. **Alerts** are re-derived every five ticks: high congestion ports, delayed vessels, and chokepoints with heavy traffic.

The fleet itself is generated deterministically from a seeded PRNG (`src/data/vessels.ts`), so the same vessels appear on every load and the documented flows (search `EVER ACE`, `MSBU5471161`, `Singapore`) behave predictably. A few "hero" vessels are pinned to well-known positions.

The **Simulation** panel (sidebar → System → Simulation, or the LIVE badge) exposes: pause/resume, single step, update frequency (1/2/5 s), simulated time per update (15 min / 1 h / 3 h), and toggles for vessel movement and activity generation.

## 6. Data architecture

```text
src/
  components/         React UI (map, panels, pages, navigation, search, ui primitives)
    map/              MapView (wires stores → MapLibre), controls, tooltip
    panels/           Vessel / Port / Container detail panels, Filters, Simulation, Settings
    dashboard/        Stats bar, activity feed, page shell
    vessels/ ports/ routes/ alerts/ tracking/ voyage/   full-page views
  data/               Simulated datasets
    ports.ts          60 ports with coordinates, UN/LOCODE and demo statistics
    lanes.ts          9 shipping lanes as waypoint polylines through real sea corridors
    vessels.ts        Deterministic fleet generator (320 vessels) + navigation state
    containers.ts     24 demo container tracking records (valid ISO 6346 check digits)
    operators.ts      Carriers, vessel naming, flags, container prefixes
    zones.ts          Named maritime areas (straits, canals, seas) for events/alerts/search
    regions.ts        Region bounds + position → region classifier
  lib/
    providers/        Data provider interfaces + Mock implementations (the API boundary)
    simulation/       SimulationEngine, boot, navigation types
    map/              MapScene (MapLibre wrapper), style resolution + offline fallback,
                      canvas-drawn vessel icons, GeoJSON builders, imperative map bus
    search/           Query classifier (container / IMO / MMSI / text) and ranked search
    store/            Minimal external store, UI store, persisted settings store
    formatting/       Number, date, speed, distance and relative-time formatting
    geo.ts            Haversine distance, bearing, destination point, great-circle interpolation
    selectors.ts      Fleet statistics, filtering, lane statistics, nearby vessels
  types/              Vessel, Port, Container, ShippingLane, events, settings
  pages/index.astro   The single Astro page mounting the React app
scripts/
  prepare-world-data.mjs   Builds public/data/world-110m.geojson (offline basemap fallback)
  soak-simulation.ts       Headless engine soak test
```

Business logic (movement, search, filtering, statistics) lives in `src/lib`; components only render state and dispatch actions. Views are switched client-side and mirrored to the URL hash (`#vessels`, `#ports`, …) so they can be linked.

## 7. Map configuration

The map uses MapLibre GL JS with free, key-less basemaps by default:

- Dark theme: CARTO **Dark Matter** (`https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`)
- Light theme: CARTO **Positron** (`https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`)

Both can be overridden with environment variables (see below). Any MapLibre-compatible style URL works, including styles that need a token embedded in the URL (never hard-code a key in source; put the full URL in `.env`).

**Offline fallback.** If the basemap cannot be fetched (no network, blocked CDN) the app automatically switches to a bundled style rendered from Natural Earth 1:110m country outlines (`public/data/world-110m.geojson`), so development never shows a blank map. Set `PUBLIC_MAP_STYLE_URL=local` to force it.

**Maritime re-theme.** The CARTO styles ship as neutral grey cartography, so after every style load `src/lib/map/basemapTheme.ts` repaints the basemap layers by id into a nautical palette: deep-navy ocean and slate land in dark mode, soft-blue ocean and warm light land in light mode, with quiet borders and labels. The pass is best-effort and skips layers it doesn't recognise, so custom styles still work. The bundled offline fallback uses the same palette.

Radar layers are added on top of whichever basemap loads: a faint nautical graticule, lanes (dashed lines), ports (congestion-coloured circles + labels), traffic heatmap, vessel symbols (canvas-drawn ship icons rotated by heading, status-coloured), vessel labels (zoom ≥ 5.5, toggleable) and the highlighted route/lane lines. All vessel data goes through a single GeoJSON source updated with `setData`; there are no per-vessel DOM elements.

**Map controls.** Besides zoom, reset and world view, the control stack has a "person" marker (Google Maps style): drag it onto the map and release to zoom to that spot, or click it and then click the map. If a port is within 90 nm of the drop the port panel opens. The desktop sidebar collapses to an icon rail via the button at its bottom; the state is remembered.

## 8. Environment variables

Copy `.env.example` to `.env`. All variables are optional.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PUBLIC_MAP_STYLE_URL` | CARTO Dark Matter | MapLibre style JSON URL for the dark theme. `local` forces the bundled offline style. |
| `PUBLIC_MAP_STYLE_URL_LIGHT` | CARTO Positron | Style URL for the light theme. |
| `PUBLIC_SIM_INTERVAL_MS` | `2000` | Default simulation update interval in milliseconds (users can change it in the UI). |

Reserved for future real-data providers (not read by the MVP): `AIS_API_URL`, `AIS_API_KEY`, `CONTAINER_TRACKING_API_URL`, `CONTAINER_TRACKING_API_KEY`.

Example `.env`:

```dotenv
PUBLIC_MAP_STYLE_URL=https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json
PUBLIC_MAP_STYLE_URL_LIGHT=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
PUBLIC_SIM_INTERVAL_MS=2000
```

## 9. Replacing `MockVesselProvider` with a real API

The UI never touches datasets directly; it talks to provider interfaces in `src/lib/providers/types.ts`:

```ts
interface VesselDataProvider {
  readonly name: string;
  readonly simulated: boolean;
  getVessels(): Promise<Vessel[]>;
  getVessel(id: string): Promise<Vessel | null>;
  searchVessels(query: string): Promise<Vessel[]>;
}
```

To connect an AIS feed:

1. Create `src/lib/providers/ais.ts` implementing `VesselDataProvider`, mapping the API's fields onto the `Vessel` shape in `src/types/vessel.ts` (IMO, MMSI, position, SOG/COG, status, destination, ETA, …). Set `simulated = false` so the "Simulated data" labels disappear and the Simulation panel reports a live source.
2. Register it in `getProviders()` (`src/lib/providers/index.ts`):

   ```ts
   providers = {
     vessels: new AISVesselProvider(import.meta.env.PUBLIC_AIS_API_URL),
     containers: new MockContainerProvider(),
     ports: new MockPortProvider(),
   };
   ```

3. Decide how positions refresh. The `SimulationEngine` only moves vessels for which it has navigation state (the mock provider supplies it). With a real provider the engine will not invent movement; instead poll the provider (or subscribe to a websocket) and push updates into the engine store with `engine.store.setState({ vessels, positionsVersion: n + 1 })`. The map interpolates between updates automatically. A thin `LiveFeedService` in `src/lib/simulation/` is the natural place for this; keep events/alerts derivation as is or replace it with server-side data.

Because keys must not be shipped to the browser, front a paid AIS API with a small server (an Astro server endpoint or serverless function) and point the provider at that endpoint.

## 10. Adding a container tracking provider

```ts
interface ContainerDataProvider {
  readonly name: string;
  readonly simulated: boolean;
  searchContainer(containerNumber: string): Promise<Container | null>;
}
```

Implement it against a carrier API, a container-tracking aggregator, an EDI feed (IFTSTA/IFTMBF events) or your own logistics database, returning the `Container` shape from `src/types/container.ts` (status, vessel/voyage, POL/POD, current location, ETA, route and a milestone list for the timeline). Swap it into `getProviders()`; the global search, container panel and tracking page pick it up unchanged. `src/lib/identifiers.ts` contains ISO 6346 validation (owner code + serial + check digit) you can reuse to validate input before calling a paid API.

## 11. Production deployment

The live demo runs on Vercel at https://global-shipping-radar.vercel.app. The Vercel project is connected to this GitHub repository, so:

- every merge to `main` deploys production automatically;
- every pull request gets its own preview deployment, linked in a PR comment.

`vercel.json` pins the build settings (Astro preset, `npm ci`, `npm run build`, output `dist`), so Git-triggered builds and one-off CLI deploys (`npx vercel deploy --prod`) behave identically.

The site is fully static and can be hosted anywhere:

```bash
npm run build      # outputs ./dist
```

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, S3 + CloudFront, GitHub Pages, nginx). Notes:

- Set `PUBLIC_*` variables at build time; they are inlined into the bundle.
- The MapLibre web worker is emitted as a separate asset in `dist/_astro/`; make sure your host serves `.js` files with a JavaScript MIME type (all mainstream hosts do).
- If you self-host basemap tiles, point `PUBLIC_MAP_STYLE_URL` at your style and allow the tile/glyph/sprite hosts in any Content-Security-Policy.
- The bundled fallback outlines (`public/data/world-110m.geojson`, ~170 kB) are only fetched when the remote basemap fails.

## 12. Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` | Focus the global search |
| `Esc` | Close search results, detail panels, overlays and full-page views |
| `↑` / `↓` | Move through search results |
| `Enter` | Select the highlighted (or first) search result |
| `Tab` | Standard focus navigation; all controls are real buttons with visible focus states |

## 13. Quality checks

- `npm run check` — Astro + TypeScript strict diagnostics (0 errors).
- `npm run test:sim` — runs the engine for thousands of simulated hours and asserts every vessel keeps valid coordinates, speeds, headings, ETAs and routes; also validates IMO and ISO 6346 check digits in the datasets.
- The UI was reviewed with Playwright across the main flows (search → fly-to → details, container lookup, port lookup, all pages, filters, simulation pause/resume, light theme, phone layout) with no console errors.

## Future data integration points

| Domain | Interface | Candidates |
| --- | --- | --- |
| Vessel positions | `VesselDataProvider` | AIS APIs (terrestrial/satellite AIS aggregators), your own AIS receiver network |
| Port statistics | `PortDataProvider` | Port community systems, terminal operators, congestion indices |
| Container tracking | `ContainerDataProvider` | Carrier APIs, container-tracking APIs, EDI, your own FM database |

None of these are integrated yet and none are required to run the demo.
