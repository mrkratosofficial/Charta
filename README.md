<p align="center"><img src="brand/charta-logo-black.png" alt="Charta — Find your way back." width="480"></p>

# Charta

ChartaGPS: an outdoor GPS web app for hiking. It runs in any modern browser and can be installed to a phone's home screen.

## Features

- **Maps:** topo (OpenTopoMap), street (OpenStreetMap) and satellite (Esri)
- **Live location** with heading and accuracy circle, plus follow mode
- **Track recording** with pause/resume. Shows distance, time, speed, altitude and ascent, and keeps going after a page reload.
- **Waypoints**: drop one with the flag button or by right-clicking / long-pressing the map. *Go to* shows distance, bearing and a direction arrow.
- **GPX import/export** for tracks, routes and waypoints
- **Offline maps**:
  - The app opens with no connection.
  - The last 4,000 viewed tiles are cached.
  - **Download area** saves a region ahead of a trip, from your own tile source (Settings → My tiles).
- GPS simulator for testing on a computer

## Run locally

```bash
python3 -m http.server 8642
```

Then open http://localhost:8642. Phones only give websites your location over HTTPS, so host it (e.g. GitHub Pages or Netlify) to use it on a phone.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole app (Leaflet, UI, GPS, recording, GPX, offline downloads) |
| `sw.js` | Service worker: offline app shell and tile caching |
| `manifest.webmanifest` | Install-to-home-screen metadata |
| `brand/` | Logo (black/white, wordmark, arrow) and app icons |

## Map data and tile usage

Map data © OpenStreetMap contributors; topo style © OpenTopoMap (CC-BY-SA); imagery © Esri.

The free community tile servers don't allow bulk downloading. Charta only caches the tiles you view from them. **Download area** works only with a tile source you add yourself: a server you host, or a provider plan that allows offline use.

All tracks, waypoints and settings are stored only in the browser on your device.
