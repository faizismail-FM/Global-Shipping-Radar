// Local stand-in for wss://stream.aisstream.io used to test the relay endpoint.
// Usage: node scripts/mock-aisstream.mjs [port]   (expects APIKey "test-key")
import { WebSocketServer } from 'ws';

const port = Number(process.argv[2] ?? 9123);
const wss = new WebSocketServer({ port });
const NAMES = ['MAERSK ESSEN', 'EVER GIVEN', 'MSC ZOE', 'CMA CGM RIVOLI', 'ONE APUS', 'HMM OSLO', 'COSCO SHIPPING LEO', 'NORDIC GLORIA', 'TORM FREEDOM', 'STENA IMPERO'];

wss.on('connection', (ws) => {
  let timer = null;
  ws.on('message', (raw) => {
    let sub;
    try { sub = JSON.parse(raw.toString()); } catch { return; }
    if (sub.APIKey !== 'test-key') { ws.send(JSON.stringify({ error: 'Api Key Is Not Valid' })); ws.close(1000); return; }
    const [[lat1, lon1], [lat2, lon2]] = sub.BoundingBoxes[0];
    const s = Math.min(lat1, lat2), n = Math.max(lat1, lat2), w = Math.min(lon1, lon2), e = Math.max(lon1, lon2);
    const fleet = Array.from({ length: 40 }, (_, i) => ({
      mmsi: 200000000 + i, name: NAMES[i % NAMES.length] + (i >= NAMES.length ? ` ${i}` : ''),
      lat: s + (n - s) * ((i * 37) % 100) / 100, lon: w + (e - w) * ((i * 61) % 100) / 100,
      sog: 8 + (i % 12), cog: (i * 29) % 360, nav: i % 7 === 0 ? 1 : i % 11 === 0 ? 5 : 0, type: i % 3 === 0 ? 80 : 70,
    }));
    let k = 0;
    timer = setInterval(() => {
      const v = fleet[k % fleet.length];
      const time = new Date().toISOString().replace('T', ' ').replace('Z', ' +0000 UTC');
      if (k % 5 === 0) {
        ws.send(JSON.stringify({ MessageType: 'ShipStaticData', MetaData: { MMSI: v.mmsi, ShipName: v.name, time_utc: time }, Message: { ShipStaticData: { UserID: v.mmsi, ImoNumber: 9000000 + v.mmsi % 100000, CallSign: 'TEST' + (v.mmsi % 100), Name: v.name, Type: v.type, Destination: 'NLRTM', Eta: { Month: 9, Day: 20, Hour: 8, Minute: 30 }, Dimension: { A: 200, B: 100, C: 20, D: 25 }, MaximumStaticDraught: 12.5 } } }));
      }
      ws.send(JSON.stringify({ MessageType: 'PositionReport', MetaData: { MMSI: v.mmsi, ShipName: v.name, latitude: v.lat, longitude: v.lon, time_utc: time }, Message: { PositionReport: { UserID: v.mmsi, Latitude: v.lat, Longitude: v.lon, Sog: v.sog, Cog: v.cog, TrueHeading: v.cog, NavigationalStatus: v.nav, Valid: true } } }));
      k++;
    }, 25);
  });
  ws.on('close', () => timer && clearInterval(timer));
});
console.log(`mock aisstream listening on ws://127.0.0.1:${port}`);
