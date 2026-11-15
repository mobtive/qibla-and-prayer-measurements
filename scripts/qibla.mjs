// Qibla bearings three ways, for the cities on qibladaily.com's two qibla pages:
//   /qibla/how-it-is-calculated            (great circle vs WGS-84 geodesic vs rhumb line)
//   /blog/qibla-in-the-southern-hemisphere (great circle vs rhumb line)
//
// great_circle  adhan-js Qibla() — initial bearing of the great circle on a sphere
// geodesic      Vincenty inverse on the WGS-84 ellipsoid, initial azimuth
// rhumb         constant-heading line (straight line on a Mercator map)
//
// All bearings are degrees clockwise from true north. Writes data/qibla-bearings.csv.
import { Coordinates, Qibla } from "adhan";
import { writeFileSync } from "node:fs";

export const KAABA = { lat: 21.4225241, lng: 39.8261818 };

// City-centre coordinates (decimal degrees, WGS-84). `pages` says which
// published table the city appears in.
export const CITIES = [
  { city: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, pages: ["method"] },
  { city: "New York", country: "United States", lat: 40.7128, lng: -74.006, pages: ["method"] },
  { city: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, pages: ["method"] },
  { city: "Istanbul", country: "Turkey", lat: 41.0082, lng: 28.9784, pages: ["method"] },
  { city: "Lagos", country: "Nigeria", lat: 6.5244, lng: 3.3792, pages: ["method"] },
  { city: "Kuala Lumpur", country: "Malaysia", lat: 3.139, lng: 101.6869, pages: ["method"] },
  { city: "Nairobi", country: "Kenya", lat: -1.2921, lng: 36.8219, pages: ["southern"] },
  { city: "Jakarta", country: "Indonesia", lat: -6.2088, lng: 106.8456, pages: ["method", "southern"] },
  { city: "São Paulo", country: "Brazil", lat: -23.5505, lng: -46.6333, pages: ["southern"] },
  { city: "Johannesburg", country: "South Africa", lat: -26.2041, lng: 28.0473, pages: ["southern"] },
  { city: "Perth", country: "Australia", lat: -31.9505, lng: 115.8605, pages: ["southern"] },
  { city: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, pages: ["method", "southern"] },
  { city: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241, pages: ["method", "southern"] },
  { city: "Buenos Aires", country: "Argentina", lat: -34.6037, lng: -58.3816, pages: ["southern"] },
  { city: "Auckland", country: "New Zealand", lat: -36.8485, lng: 174.7633, pages: ["southern"] },
  { city: "Melbourne", country: "Australia", lat: -37.8136, lng: 144.9631, pages: ["southern"] },
];

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const norm = (d) => ((d % 360) + 360) % 360;

export function greatCircle(lat, lng) {
  return Qibla(new Coordinates(lat, lng));
}

// Vincenty (1975) inverse formula, WGS-84. Returns the initial azimuth.
export function geodesic(lat1, lng1, lat2 = KAABA.lat, lng2 = KAABA.lng) {
  const a = 6378137, f = 1 / 298.257223563, b = (1 - f) * a;
  const L = rad(lng2 - lng1);
  const U1 = Math.atan((1 - f) * Math.tan(rad(lat1)));
  const U2 = Math.atan((1 - f) * Math.tan(rad(lat2)));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1), sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  let lambda = L, prev, sinSigma, cosSigma, sigma, cosSqAlpha, cos2SigmaM, iter = 0;
  do {
    const sinL = Math.sin(lambda), cosL = Math.cos(lambda);
    sinSigma = Math.hypot(cosU2 * sinL, cosU1 * sinU2 - sinU1 * cosU2 * cosL);
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosL;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cosU1 * cosU2 * sinL) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSqAlpha ? cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha : 0;
    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    prev = lambda;
    lambda = L + (1 - C) * f * sinAlpha *
      (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  } while (Math.abs(lambda - prev) > 1e-12 && ++iter < 200);
  if (iter >= 200) throw new Error(`Vincenty did not converge for ${lat1},${lng1}`);
  const sinL = Math.sin(lambda), cosL = Math.cos(lambda);
  return norm(deg(Math.atan2(cosU2 * sinL, cosU1 * sinU2 - sinU1 * cosU2 * cosL)));
}

// Rhumb line: atan2(Δλ, Δψ), ψ = ln(tan(π/4 + φ/2)) (inverse Gudermannian).
export function rhumb(lat1, lng1, lat2 = KAABA.lat, lng2 = KAABA.lng) {
  const dPsi = Math.log(Math.tan(Math.PI / 4 + rad(lat2) / 2) / Math.tan(Math.PI / 4 + rad(lat1) / 2));
  let dLng = rad(lng2 - lng1);
  if (Math.abs(dLng) > Math.PI) dLng = dLng > 0 ? dLng - 2 * Math.PI : dLng + 2 * Math.PI;
  return norm(deg(Math.atan2(dLng, dPsi)));
}

const angleDiff = (x, y) => { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };

export function rows() {
  return CITIES.map((c) => {
    const gc = greatCircle(c.lat, c.lng), geo = geodesic(c.lat, c.lng), rl = rhumb(c.lat, c.lng);
    return { ...c, gc, geo, rl, sphereVsEllipsoid: angleDiff(gc, geo), flatMapError: angleDiff(gc, rl) };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = ["city,country,latitude,longitude,great_circle_deg,wgs84_geodesic_deg,rhumb_line_deg,sphere_vs_ellipsoid_deg,flat_map_error_deg,published_on"];
  for (const r of rows()) {
    out.push([`"${r.city}"`, `"${r.country}"`, r.lat, r.lng, r.gc.toFixed(3), r.geo.toFixed(3), r.rl.toFixed(3),
      r.sphereVsEllipsoid.toFixed(3), r.flatMapError.toFixed(3), r.pages.join("|")].join(","));
  }
  writeFileSync(new URL("../data/qibla-bearings.csv", import.meta.url), out.join("\n") + "\n");
  console.log(out.join("\n"));
}
