# Qibla and prayer-time measurements

Computed figures, and the scripts that produce them, behind three pages on
[qibladaily.com](https://qibladaily.com):

- [How the qibla is calculated](https://qibladaily.com/qibla/how-it-is-calculated):
  great circle vs WGS-84 geodesic vs flat-map (rhumb-line) bearings.
- [Qibla in the southern hemisphere](https://qibladaily.com/blog/qibla-in-the-southern-hemisphere):
  where a flat map misleads, ten cities.
- [Why prayer apps differ](https://qibladaily.com/prayer-times/why-apps-differ):
  five calculation methods across eight latitudes, every day of 2026.

`npm test` checks every CSV against the figures published on those pages and
fails on any mismatch, so the tables and the data cannot quietly drift apart.

```bash
npm install
npm run all   # regenerate data/*.csv
npm test      # compare with the published tables
```

Requires Node 18+. The only dependency is [adhan-js](https://github.com/batoulapps/adhan-js),
pinned to 4.4.6. If its defaults change, the prayer figures change with
them; that is a property of the library, not noise.

## Data

| File | Rows | What it holds |
|---|---|---|
| `data/qibla-bearings.csv` | 16 cities | Great-circle, WGS-84 geodesic and rhumb-line bearing, the sphere-vs-ellipsoid gap and the flat-map error |
| `data/prayer-times-2026.csv` | 14,600 | Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha (UTC) for 8 cities × 5 methods × 365 days |
| `data/prayer-spread-daily-2026.csv` | 2,920 | Minutes between the earliest and latest method, Fajr and Isha, per city per day |
| `data/prayer-spread-summary-2026.csv` | 8 | Spread on the March equinox and the year's widest Fajr spread |
| `data/berlin-solstice-2026.csv` | 4 | Berlin, 21 June: Fajr from each method's angle alone vs with adhan's default high-latitude rule |
| `data/tromso-no-angle-days-2026.csv` | 69 | Days in Tromsø on which no method's Fajr angle is reached |

All bearings are degrees clockwise from true north. A phone compass shows
magnetic north; correct for local declination before using a bearing.

## Method

### Qibla (`scripts/qibla.mjs`)

Kaaba: 21.4225241° N, 39.8261818° E. City coordinates are city centres,
listed in the script.

- **Great circle**: `Qibla(new Coordinates(lat, lng))` from adhan-js, the
  initial bearing of the shortest path on a sphere:
  θ = atan2(sin Δλ, cos φ₁ · tan φ₂ − sin φ₁ · cos Δλ).
- **WGS-84 geodesic**: Vincenty's inverse formula on the WGS-84 ellipsoid
  (a = 6,378,137 m, f = 1/298.257223563), initial azimuth.
- **Rhumb line**: the constant-heading line, which is a straight line on a
  Mercator map: atan2(Δλ, Δψ) with ψ = ln tan(π/4 + φ/2).

Finding: the sphere and the ellipsoid never differ by more than 0.26° in
these cities (Auckland), so the spherical formula is enough. The flat map is
off by up to 48.0° (Toronto) and 33.3° (Auckland).

### Prayer methods (`scripts/prayer-methods.mjs`)

adhan-js with default parameters for `MuslimWorldLeague` (Fajr 18°, Isha 17°),
`NorthAmerica` (ISNA, 15°/15°), `Egyptian` (19.5°/17.5°), `Karachi` (18°/18°)
and `UmmAlQura` (18.5°, Isha 90 minutes after Maghrib), for each calendar day
of 2026. The equinox is taken as 20 March 2026.

- Spreads are measured between absolute instants, not clock readings. A
  northern Isha can fall after midnight, and a clock comparison would report
  a 24-hour gap where the real one is minutes.
- adhan's default high-latitude rule (`MiddleOfTheNight`) caps Fajr and Isha
  when the angle result falls beyond the middle of the night. In Berlin on
  21 June the four angle-based methods give Fajr between 00:23 and 00:56
  UTC; with the default rule all four return 23:08 UTC the evening before.
  `berlin-solstice-2026.csv` compares the two by setting
  `HighLatitudeRule.TwilightAngle`, which turns the cap off.
- With the cap off, Tromsø (69.6° N) has no angle-based Fajr in any of the
  five methods from 18 May to 25 July 2026: 69 days.

These are measurements of one widely used implementation and its defaults,
not universal constants. A library with different high-latitude defaults
will give different numbers, which is part of why apps disagree.

## Licence

- Scripts: [MIT](LICENSE).
- Data (`data/*.csv`): [CC BY 4.0](data/LICENSE). Credit "Qibla Daily —
  qibladaily.com" and link to this repository or the source page.

Found a figure that does not reproduce? Open an issue, or write via
[qibladaily.com/contact](https://qibladaily.com/contact).
