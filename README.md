# Cast Conditions 🎣

A real-time fishing conditions dashboard powered by live weather, tide, and AI data.

## Features
- Live wind, temperature, barometric pressure
- Real-time water temperature and wave height/period
- NOAA tide predictions with visual tide chart
- 24-hour wind & wave forecast
- Moon phase calculator
- Species-specific bite forecast (striped bass, flounder, bluefish, sea bass, weakfish, kingfish)
- AI-powered fishing guide summary (Claude)
- Location search (any coastal location worldwide)
- Saved fishing spots (persisted in localStorage)

## Data Sources
| Data | Source | Cost |
|------|--------|------|
| Wind, temp, pressure, wave forecast | Open-Meteo | Free |
| Marine/wave height | Open-Meteo Marine | Free |
| Water temperature, tides | NOAA CO-OPS | Free |
| AI fishing summary | Anthropic Claude | Per call |

## Getting Started

```bash
npm install
npm start
```

## Deploy to Vercel (recommended)

1. Push this repo to GitHub
2. Go to vercel.com → Import Project → select your repo
3. Add env var: `REACT_APP_ANTHROPIC_API_KEY` = your key
4. Deploy — done!

## Deploy to Netlify

```bash
npm run build
# Drag the build/ folder to netlify.com/drop
```

## Expanding the App

- **Add more NOAA stations** — swap `NOAA_STATION` in `src/utils/api.ts` for any station ID from tidesandcurrents.noaa.gov
- **Push notifications** — add a service worker that checks conditions on a schedule
- **User accounts** — add Supabase or Firebase for cloud-synced saved spots
- **More species** — extend the `calcSpecies` function in `src/utils/fishing.ts`
# cast-conditions
