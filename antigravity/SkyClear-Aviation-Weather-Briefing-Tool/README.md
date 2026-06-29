# SkyClear &mdash; Aviation Weather Briefing Tool

SkyClear is a professional glass-cockpit EFB (Electronic Flight Bag) style web application built for PC and laptop browsers. It serves as a real utility tool for student pilots, licensed pilots, and aviation dispatchers to decode complex meteorological weather observations (METAR) and terminal aerodrome forecasts (TAF) into plain, human-readable English.

Developed by **Nellutla Pravaltej** &mdash; Student Pilot &amp; Aerospace Engineering Applicant (applying to Purdue, MIT, and Stanford).

## Architecture &amp; Key Features

1. **Airport Search Dashboard**: Instantly search any 3 or 4-letter International Civil Aviation Organization (ICAO) code (e.g., `KJFK`, `EGLL`, `WSSS`, `OMDB`) to fetch active weather briefings. Pre-configured presets of global hubs are provided for rapid testing.
2. **METAR Decoder Grid**: Splits the raw observation string and maps variables with physical constraints:
   - **Station &amp; Observation Time**: Dual timezone support (UTC and local machine timezone).
   - **Wind Vectors**: Parses direction degrees into compass sector orientations (e.g., *270° &mdash; From the West*), with calm detection and speed-dependent dynamic color-coding.
   - **Visibility (SM/KM)**: Color codes safety limits (VFR/IFR) and rates visual clarity.
   - **Cloud Layers**: Maps layer altitudes in both feet (AGL) and meters, highlighting convective thunder hazards such as Cumulonimbus (`CB`) or Towering Cumulus (`TCU`) in red.
   - **Present Weather**: Translates standard shorthand codes (e.g., `+TSRA`, `-DZ`, `BR`) into descriptive sentences.
   - **Thermodynamic Spread**: Calculates temperature-dewpoint spreads and alerts of imminent fog danger when the spread drops below 3°C.
   - **Altimeter**: Translates QNH values and detects high/low-pressure systems.
   - **Aeronautical Flight Category Badge**: Clear indicators for VFR, MVFR, IFR, and LIFR conditions with technical explanations.
3. **Horizontal TAF Timeline**: Divides Terminal Aerodrome Forecast reports chronologically into individual, side-scrolling cards with independent flight category calculations.
4. **Recharts Forecast Trends**: Compiles wind speed, gusts, and visibility forecasts across the TAF duration into interactive, beautiful, high-contrast trend graphs.
5. **Educational Pilot Notes Sidebar**: Static quick-reference cards discussing METAR/TAF structures, physical fog indicators, VFR rules, and links to the official FAA Aeronautical Information Manual.

## Technical Stack

* **Core**: React 19, Vite 6, TypeScript
* **Styling**: Tailwind CSS v4, Custom EFB Slate Scrollbars
* **Charts**: Recharts (fully customized for dark canvas grids)
* **API Integration**: Real-time XML/JSON stream ingestion from NOAA / AviationWeather.gov
* **Performance**: Fully offline-ready decoders using zero-dependency, rule-based Regex algorithms

## Local Development &amp; Installation

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Build the production package:
   ```bash
   npm run build
   ```

## Deploying to Vercel

SkyClear is structured as a Vite Single Page Application (SPA), which is fully ready for zero-configuration, instant deployment on Vercel:

1. Connect your GitHub repository to Vercel.
2. Configure build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Click **Deploy**.
