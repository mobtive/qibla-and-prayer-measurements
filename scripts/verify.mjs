// Checks the CSVs against the figures published on qibladaily.com.
// Run after `npm run all`; exits non-zero on any mismatch.
import { readFileSync } from "node:fs";
const csv = (f) => {
  const [h, ...rows] = readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8").trim().split("\n");
  const keys = h.split(",");
  return rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [keys[i], v.replace(/"/g, "")])));
};
let bad = 0;
const eq = (what, got, want) => { if (String(got) !== String(want)) { bad++; console.log(`MISMATCH ${what}: got ${got}, published ${want}`); } };

// /qibla/how-it-is-calculated — great circle, geodesic (3 dp), rhumb (2 dp)
const METHOD_PAGE = { Toronto: [54.581, 54.493, 102.61], "New York": [58.482, 58.396, 101.28], Sydney: [277.5, 277.319, 297.5],
  London: [118.987, 118.868, 133.83], "Kuala Lumpur": [292.538, 292.442, 286.9], Lagos: [63.33, 63.457, 67.09],
  Istanbul: [151.621, 151.514, 154.84], "Cape Town": [23.353, 23.467, 20.24], Jakarta: [295.152, 295.025, 292.79] };
// /blog/qibla-in-the-southern-hemisphere — qibla, flat map, error (1 dp)
const SOUTHERN = { Nairobi: [7.2, 7.4, 0.2], Johannesburg: [14.6, 13.5, 1.1], Jakarta: [295.2, 292.8, 2.4], "Cape Town": [23.4, 20.2, 3.1],
  "São Paulo": [68.9, 61.9, 7.0], Perth: [295.4, 306.2, 10.8], "Buenos Aires": [76.3, 59.1, 17.2], Sydney: [277.5, 297.5, 20.0],
  Melbourne: [278.8, 300.9, 22.0], Auckland: [261.2, 294.5, 33.3] };
const q = Object.fromEntries(csv("qibla-bearings.csv").map((r) => [r.city, r]));
for (const [c, [gc, geo, rl]] of Object.entries(METHOD_PAGE)) {
  eq(`${c} great circle`, +(+q[c].great_circle_deg).toFixed(3), gc);
  eq(`${c} geodesic`, +(+q[c].wgs84_geodesic_deg).toFixed(3), geo);
  eq(`${c} rhumb`, +(+q[c].rhumb_line_deg).toFixed(2), rl);
}
for (const [c, [gc, rl, err]] of Object.entries(SOUTHERN)) {
  eq(`${c} qibla`, (+q[c].great_circle_deg).toFixed(1), gc.toFixed(1));
  eq(`${c} flat map`, (+q[c].rhumb_line_deg).toFixed(1), rl.toFixed(1));
  eq(`${c} error`, (+q[c].flat_map_error_deg).toFixed(1), err.toFixed(1));
}

// /prayer-times/why-apps-differ
const SPREAD = { Mecca: [19, 29, 24, "06-05"], Cairo: [22, 24, 28, "06-04"], Istanbul: [25, 16, 43, "06-23"], London: [32, 24, 118, "07-28"],
  Berlin: [32, 27, 119, "08-01"], Stockholm: [41, 53, 130, "08-24"], "Reykjavík": [53, 84, 138, "09-06"], "Tromsø": [97, 153, 151, "09-20"] };
for (const r of csv("prayer-spread-summary-2026.csv")) {
  const [fe, ie, fm, fd] = SPREAD[r.city];
  eq(`${r.city} Fajr equinox`, r.fajr_spread_equinox_min, fe);
  eq(`${r.city} Isha equinox`, r.isha_spread_equinox_min, ie);
  eq(`${r.city} Fajr max`, r.fajr_spread_max_min, fm);
  eq(`${r.city} Fajr max date`, r.fajr_spread_max_date.slice(5), fd);
}
const BERLIN = { Egyptian: "00:23", MWL: "00:34", Karachi: "00:34", ISNA: "00:56" };
for (const r of csv("berlin-solstice-2026.csv")) {
  eq(`Berlin ${r.method} angle only`, r.fajr_angle_only_utc.slice(11, 16), BERLIN[r.method]);
  eq(`Berlin ${r.method} default rule`, r.fajr_default_rule_utc.slice(11, 16), "23:08");
}
const t = csv("tromso-no-angle-days-2026.csv");
eq("Tromsø no-angle days", t.length, 69);
eq("Tromsø first", t[0].date, "2026-05-18");
eq("Tromsø last", t.at(-1).date, "2026-07-25");

console.log(bad ? `${bad} mismatch(es)` : "All published figures reproduce.");
process.exit(bad ? 1 : 0);
