// Five prayer-time calculation methods compared at eight latitudes, every day
// of 2026, with adhan-js defaults. Reproduces the tables on
// https://qibladaily.com/prayer-times/why-apps-differ
//
// Spreads are measured between absolute instants, not clock readings: a
// northern Isha can fall after midnight UTC, and a clock comparison would
// report a 24-hour gap where the real one is minutes.
//
// Writes:
//   data/prayer-times-2026.csv          every prayer, every method, every city, every day (UTC)
//   data/prayer-spread-daily-2026.csv   minutes between earliest and latest method, per day
//   data/prayer-spread-summary-2026.csv equinox spreads and the year's widest Fajr spread
//   data/berlin-solstice-2026.csv       Fajr from the angle alone vs with the default high-latitude rule
//   data/tromso-no-angle-days-2026.csv  days with no angle-based Fajr in any method
import { Coordinates, CalculationMethod, PrayerTimes, HighLatitudeRule } from "adhan";
import { writeFileSync } from "node:fs";

export const METHODS = [
  { key: "MuslimWorldLeague", label: "MWL", fajr: "18°", isha: "17°" },
  { key: "NorthAmerica", label: "ISNA", fajr: "15°", isha: "15°" },
  { key: "Egyptian", label: "Egyptian", fajr: "19.5°", isha: "17.5°" },
  { key: "Karachi", label: "Karachi", fajr: "18°", isha: "18°" },
  { key: "UmmAlQura", label: "Umm al-Qura", fajr: "18.5°", isha: "90 min after Maghrib" },
];

export const CITIES = [
  { city: "Mecca", lat: 21.4225, lng: 39.8262 },
  { city: "Cairo", lat: 30.0444, lng: 31.2357 },
  { city: "Istanbul", lat: 41.0082, lng: 28.9784 },
  { city: "London", lat: 51.5074, lng: -0.1278 },
  { city: "Berlin", lat: 52.52, lng: 13.405 },
  { city: "Stockholm", lat: 59.3293, lng: 18.0686 },
  { city: "Reykjavík", lat: 64.1466, lng: -21.9426 },
  { city: "Tromsø", lat: 69.6492, lng: 18.9553 },
];

const PRAYERS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
const EQUINOX = "2026-03-20";
const out = (name, lines) => writeFileSync(new URL(`../data/${name}`, import.meta.url), lines.join("\n") + "\n");
const iso = (t) => (isNaN(t) ? "" : t.toISOString().slice(0, 16) + "Z");

function* days2026() {
  for (let d = new Date(Date.UTC(2026, 0, 1)); d.getUTCFullYear() === 2026; d = new Date(d.getTime() + 864e5)) {
    // adhan reads the calendar date from local components.
    yield { ymd: d.toISOString().slice(0, 10), date: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) };
  }
}

const times = (coords, date, key, rule) => {
  const p = CalculationMethod[key]();
  if (rule) p.highLatitudeRule = rule;
  return new PrayerTimes(coords, date, p);
};
const spread = (ts, k) => {
  const v = ts.map((t) => t[k].getTime());
  return Math.round((Math.max(...v) - Math.min(...v)) / 6e4);
};

const all = ["city,latitude,longitude,date,method," + PRAYERS.map((p) => `${p}_utc`).join(",")];
const daily = ["city,date,fajr_spread_min,isha_spread_min"];
const summary = ["city,latitude,fajr_spread_equinox_min,isha_spread_equinox_min,fajr_spread_max_min,fajr_spread_max_date"];

for (const c of CITIES) {
  const coords = new Coordinates(c.lat, c.lng);
  let eq, max = { v: -1 };
  for (const { ymd, date } of days2026()) {
    const ts = METHODS.map((m) => times(coords, date, m.key));
    ts.forEach((t, i) => all.push([`"${c.city}"`, c.lat, c.lng, ymd, METHODS[i].label, ...PRAYERS.map((p) => iso(t[p]))].join(",")));
    const f = spread(ts, "fajr"), i = spread(ts, "isha");
    daily.push([`"${c.city}"`, ymd, f, i].join(","));
    if (ymd === EQUINOX) eq = { f, i };
    if (f > max.v) max = { v: f, ymd };
  }
  summary.push([`"${c.city}"`, c.lat, eq.f, eq.i, max.v, max.ymd].join(","));
}

// Berlin, 21 June: the four angle-based methods, angle only vs default rule.
const berlin = new Coordinates(52.52, 13.405), solstice = new Date(2026, 5, 21);
const berlinRows = ["method,fajr_angle_only_utc,fajr_default_rule_utc"];
for (const m of METHODS.filter((m) => m.key !== "UmmAlQura")) {
  berlinRows.push([m.label, iso(times(berlin, solstice, m.key, HighLatitudeRule.TwilightAngle).fajr),
    iso(times(berlin, solstice, m.key).fajr)].join(","));
}

// Tromsø: days on which no method's angle is reached (TwilightAngle disables the fallback).
const tromso = new Coordinates(69.6492, 18.9553);
const noAngle = ["date"];
for (const { ymd, date } of days2026()) {
  if (METHODS.every((m) => isNaN(times(tromso, date, m.key, HighLatitudeRule.TwilightAngle).fajr))) noAngle.push(ymd);
}

out("prayer-times-2026.csv", all);
out("prayer-spread-daily-2026.csv", daily);
out("prayer-spread-summary-2026.csv", summary);
out("berlin-solstice-2026.csv", berlinRows);
out("tromso-no-angle-days-2026.csv", noAngle);
console.log(summary.join("\n"));
console.log(berlinRows.join("\n"));
console.log(`Tromsø: ${noAngle.length - 1} days with no angle-based Fajr (${noAngle[1]} – ${noAngle.at(-1)})`);
