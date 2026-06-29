import {
  DecodedMETAR,
  DecodedWind,
  DecodedVisibility,
  DecodedCloudLayer,
  DecodedTemperature,
  DecodedPressure,
  FlightCategoryDetails,
  FlightCategoryType
} from './aviationTypes';

// Weather phenomena dictionaries
const MODIFIERS: Record<string, string> = {
  '+': 'Heavy',
  '-': 'Light',
  'VC': 'In the vicinity of'
};

const DESCRIPTORS: Record<string, string> = {
  'MI': 'shallow',
  'PR': 'partial',
  'BC': 'patches of',
  'DR': 'low drifting',
  'BL': 'blowing',
  'SH': 'showers of',
  'TS': 'thunderstorms with',
  'FZ': 'freezing'
};

const PRECIPITATION: Record<string, string> = {
  'DZ': 'drizzle',
  'RA': 'rain',
  'SN': 'snow',
  'SG': 'snow grains',
  'IC': 'ice crystals',
  'PL': 'ice pellets',
  'GR': 'hail',
  'GS': 'small hail',
  'UP': 'unknown precipitation'
};

const OBSCURATION: Record<string, string> = {
  'BR': 'mist',
  'FG': 'fog',
  'FU': 'smoke',
  'VA': 'volcanic ash',
  'DU': 'widespread dust',
  'SA': 'sand',
  'HZ': 'haze',
  'PY': 'spray'
};

const OTHER: Record<string, string> = {
  'PO': 'well-developed dust/sand whirls',
  'SQ': 'squalls',
  'FC': 'funnel cloud (tornado or waterspout)',
  'SS': 'sandstorm',
  'DS': 'duststorm'
};

// Compass helper
export function getCompassDirection(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  const compassDirections = [
    'North', 'North-North-East', 'North-East', 'East-North-East',
    'East', 'East-South-East', 'South-East', 'South-South-East',
    'South', 'South-South-West', 'South-West', 'West-South-West',
    'West', 'West-North-West', 'North-West', 'North-North-West'
  ];
  return `${normalized}° — From the ${compassDirections[index]}`;
}

export function getFlightCategoryDetails(category: FlightCategoryType): FlightCategoryDetails {
  switch (category) {
    case 'VFR':
      return {
        code: 'VFR',
        colorClass: 'text-green-400',
        bgClass: 'bg-green-500/15',
        borderClass: 'border-green-500/30',
        explanation: 'Visual Flight Rules: Ceiling is greater than 3,000 feet and visibility is greater than 5 miles. Suitable for flight under visual rules.'
      };
    case 'MVFR':
      return {
        code: 'MVFR',
        colorClass: 'text-sky-400',
        bgClass: 'bg-sky-500/15',
        borderClass: 'border-sky-500/30',
        explanation: 'Marginal Visual Flight Rules: Ceiling is between 1,000 and 3,000 feet, or visibility is 3 to 5 miles. Use extra caution, especially student pilots.'
      };
    case 'IFR':
      return {
        code: 'IFR',
        colorClass: 'text-red-400',
        bgClass: 'bg-red-500/15',
        borderClass: 'border-red-500/30',
        explanation: 'Instrument Flight Rules: Ceiling is between 500 and 1,000 feet, or visibility is 1 to 3 miles. Requires instrument rating and an active flight plan.'
      };
    case 'LIFR':
      return {
        code: 'LIFR',
        colorClass: 'text-purple-400',
        bgClass: 'bg-purple-500/15',
        borderClass: 'border-purple-500/30',
        explanation: 'Low Instrument Flight Rules: Ceiling is less than 500 feet, or visibility is less than 1 mile. Extremely hazardous conditions, strict instrument rules apply.'
      };
  }
}

// Helper to parse single weather phenomenon code
function decodeWeatherCode(code: string): string {
  let result = '';
  let remaining = code;

  // 1. Check modifier (+ or -)
  if (remaining.startsWith('+') || remaining.startsWith('-')) {
    result += MODIFIERS[remaining[0]] + ' ';
    remaining = remaining.substring(1);
  } else if (remaining.startsWith('VC')) {
    result += 'vicinity ';
    remaining = remaining.substring(2);
  }

  // Helper to match code segments of 2 characters
  const parts: string[] = [];
  while (remaining.length >= 2) {
    const chunk = remaining.substring(0, 2);
    if (DESCRIPTORS[chunk]) {
      parts.push(DESCRIPTORS[chunk]);
    } else if (PRECIPITATION[chunk]) {
      parts.push(PRECIPITATION[chunk]);
    } else if (OBSCURATION[chunk]) {
      parts.push(OBSCURATION[chunk]);
    } else if (OTHER[chunk]) {
      parts.push(OTHER[chunk]);
    } else {
      // unknown chunk, just output as is
      parts.push(chunk);
    }
    remaining = remaining.substring(2);
  }

  if (parts.length > 0) {
    result += parts.join(' ');
  } else {
    result = code; // Fallback to raw code
  }

  // Capitalize first letter
  return result.trim().charAt(0).toUpperCase() + result.trim().slice(1);
}

export function decodeMETAR(raw: string, obsTimeEpoch?: number): DecodedMETAR {
  const cleanRaw = raw.replace(/\s+/g, ' ').trim().toUpperCase();
  const tokens = cleanRaw.split(' ');

  // 1. Find ICAO
  // Scan the first few tokens for the first 4-letter alphabetic token that is not a keyword.
  let icao = 'UNKNOWN';
  let icaoIndex = -1;
  const skipKeywords = ['METAR', 'SPECI', 'AUTO', 'COR', 'CORR', 'NIL', 'TEST'];
  for (let i = 0; i < Math.min(4, tokens.length); i++) {
    const tok = tokens[i];
    if (tok.length === 4 && /^[A-Z]{4}$/.test(tok) && !skipKeywords.includes(tok)) {
      icao = tok;
      icaoIndex = i;
      break;
    }
  }
  // Fallback to original logic if not found
  if (icaoIndex === -1) {
    if (tokens[0] === 'METAR' || tokens[0] === 'SPECI') {
      icaoIndex = 1;
    } else {
      icaoIndex = 0;
    }
    icao = tokens[icaoIndex] || 'UNKNOWN';
  }

  // 2. Find Time Group (ddhhmmZ)
  let timeToken = '';
  let timeIndex = -1;
  for (let i = icaoIndex + 1; i < Math.min(icaoIndex + 4, tokens.length); i++) {
    if (tokens[i].endsWith('Z') && tokens[i].length === 7 && /^\d{6}Z$/.test(tokens[i])) {
      timeToken = tokens[i];
      timeIndex = i;
      break;
    }
  }

  let day = 1;
  let hourStr = '00';
  let minStr = '00';
  let utcString = 'Unknown UTC';
  let localString = 'Unknown Local';
  let isStale = false;

  if (timeToken) {
    day = parseInt(timeToken.substring(0, 2));
    hourStr = timeToken.substring(2, 4);
    minStr = timeToken.substring(4, 6);

    const now = new Date();
    // Reconstruct observation date
    const obsDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, parseInt(hourStr), parseInt(minStr)));
    
    // If reconstructed date is in the future compared to current time (e.g. end of previous month wrap-around), adjust month
    if (obsDate.getTime() > now.getTime() + 12 * 60 * 60 * 1000) {
      obsDate.setUTCMonth(obsDate.getUTCMonth() - 1);
    }

    utcString = `${obsDate.getUTCDate().toString().padStart(2, '0')} @ ${obsDate.getUTCHours().toString().padStart(2, '0')}:${obsDate.getUTCMinutes().toString().padStart(2, '0')} UTC`;
    
    // Format local time
    localString = obsDate.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });

    const calculatedEpoch = Math.floor(obsDate.getTime() / 1000);
    const checkEpoch = obsTimeEpoch || calculatedEpoch;
    const diffMs = Date.now() - (checkEpoch * 1000);
    // Stale if older than 2 hours (7200 seconds)
    isStale = diffMs > 2 * 60 * 60 * 1000;
  }

  // 3. Wind Group
  // e.g. 27015G22KT or VRB05KT or 00000KT
  let windToken = '';
  let windIndex = -1;
  for (let i = icaoIndex + 1; i < Math.min(icaoIndex + 5, tokens.length); i++) {
    if (tokens[i].endsWith('KT') || tokens[i].includes('MPS')) {
      windToken = tokens[i];
      windIndex = i;
      break;
    }
  }

  let wind: DecodedWind = {
    direction: 0,
    directionText: 'Calm',
    speedKt: 0,
    isCalm: true,
    colorClass: 'text-green-400'
  };

  if (windToken) {
    // Check for Calm
    if (windToken.startsWith('00000') || windToken.startsWith('00000G')) {
      wind = {
        direction: 0,
        directionText: 'Calm — Wind speed less than 1 knot',
        speedKt: 0,
        isCalm: true,
        colorClass: 'text-green-400'
      };
    } else {
      // Wind regex match
      // matches e.g. 24012KT or VRB05KT or 27015G22KT
      const match = windToken.match(/^([A-Z0-9]{3})(\d{2,3})(G\d{2,3})?(KT|MPS)/);
      if (match) {
        const dirPart = match[1];
        const speedVal = parseInt(match[2]);
        const gustPart = match[3];
        const unit = match[4];

        let speedKt = speedVal;
        if (unit === 'MPS') {
          // Convert m/s to knots: 1 m/s = 1.94384 kt
          speedKt = Math.round(speedVal * 1.94384);
        }

        let direction: number | 'VRB' = 'VRB';
        let directionText = 'Variable Direction';
        if (dirPart !== 'VRB') {
          direction = parseInt(dirPart);
          directionText = getCompassDirection(direction);
        }

        let gustsKt: number | undefined;
        if (gustPart) {
          const gustVal = parseInt(gustPart.substring(1));
          gustsKt = unit === 'MPS' ? Math.round(gustVal * 1.94384) : gustVal;
        }

        const maxSpeed = gustsKt !== undefined ? Math.max(speedKt, gustsKt) : speedKt;
        let colorClass = 'text-green-400';
        if (maxSpeed >= 25) {
          colorClass = 'text-red-400';
        } else if (maxSpeed >= 15) {
          colorClass = 'text-amber-400';
        }

        wind = {
          direction,
          directionText,
          speedKt,
          gustsKt,
          isCalm: speedKt === 0 && !gustsKt,
          colorClass
        };
      }
    }
  }

  // 4. CAVOK Check
  const hasCavok = tokens.includes('CAVOK');

  // 5. Visibility Group
  // US format ends with SM, e.g., 10SM, 5SM, 1 1/2SM.
  // European format is a 4-digit token representing meters, e.g. 9999, 4000, 0800.
  let visibility: DecodedVisibility = {
    distanceSm: 10,
    distanceKm: 16.1,
    label: 'Excellent',
    colorClass: 'text-green-400'
  };

  if (hasCavok) {
    visibility = {
      distanceSm: 10,
      distanceKm: 16.0,
      label: 'Excellent',
      colorClass: 'text-green-400'
    };
  } else {
    let visToken = '';
    let visFound = false;

    // Search for SM tokens (US style)
    for (let i = Math.max(1, windIndex); i < tokens.length; i++) {
      if (tokens[i].endsWith('SM')) {
        visToken = tokens[i];
        
        // Check if there was a preceding fraction part, e.g. "1 1/2SM" split by space
        let distanceSm = 0;
        const matchFraction = visToken.match(/^(\d+\/\d+)SM$/);
        if (matchFraction && i > 0 && /^\d+$/.test(tokens[i - 1])) {
          // It's like "1" "1/2SM"
          const whole = parseInt(tokens[i - 1]);
          const parts = matchFraction[1].split('/');
          const fraction = parseInt(parts[0]) / parseInt(parts[1]);
          distanceSm = whole + fraction;
        } else {
          // standard single token, like "10SM", "1/2SM", "M1/4SM"
          const cleanToken = visToken.replace('SM', '');
          if (cleanToken.startsWith('M')) {
            // Less than
            const valStr = cleanToken.substring(1);
            if (valStr.includes('/')) {
              const parts = valStr.split('/');
              distanceSm = parseInt(parts[0]) / parseInt(parts[1]);
            } else {
              distanceSm = parseInt(valStr);
            }
          } else if (cleanToken.includes('/')) {
            const parts = cleanToken.split('/');
            distanceSm = parseInt(parts[0]) / parseInt(parts[1]);
          } else {
            distanceSm = parseFloat(cleanToken);
          }
        }

        const distanceKm = Math.round(distanceSm * 1.60934 * 10) / 10;
        visFound = true;

        let label: 'Excellent' | 'Good' | 'Moderate' | 'Poor' | 'Very Poor' = 'Excellent';
        let colorClass = 'text-green-400';

        if (distanceSm >= 6) {
          label = 'Excellent';
          colorClass = 'text-green-400';
        } else if (distanceSm >= 3) {
          label = 'Good';
          colorClass = 'text-green-400';
        } else if (distanceSm >= 1) {
          label = 'Moderate';
          colorClass = 'text-amber-400';
        } else if (distanceSm >= 0.25) {
          label = 'Poor';
          colorClass = 'text-red-400';
        } else {
          label = 'Very Poor';
          colorClass = 'text-purple-400';
        }

        visibility = {
          distanceSm,
          distanceKm,
          label,
          colorClass
        };
        break;
      }
    }

    // If no SM found, search for European format (4-digit number following wind, preceding temperature or clouds)
    if (!visFound) {
      for (let i = windIndex + 1; i < Math.min(windIndex + 4, tokens.length); i++) {
        const tok = tokens[i];
        if (/^\d{4}$/.test(tok)) {
          const meters = parseInt(tok);
          const distanceKm = meters / 1000;
          const distanceSm = Math.round(distanceKm * 0.621371 * 10) / 10;
          visFound = true;

          let label: 'Excellent' | 'Good' | 'Moderate' | 'Poor' | 'Very Poor' = 'Excellent';
          let colorClass = 'text-green-400';

          if (meters >= 10000 || tok === '9999') {
            label = 'Excellent';
            colorClass = 'text-green-400';
          } else if (meters >= 5000) {
            label = 'Good';
            colorClass = 'text-green-400';
          } else if (meters >= 1500) {
            label = 'Moderate';
            colorClass = 'text-amber-400';
          } else if (meters >= 500) {
            label = 'Poor';
            colorClass = 'text-red-400';
          } else {
            label = 'Very Poor';
            colorClass = 'text-purple-400';
          }

          visibility = {
            distanceSm,
            distanceKm,
            label,
            colorClass
          };
          break;
        }
      }
    }
  }

  // 6. Cloud Layers
  // e.g. SCT035 BKN250 or VV002 or CLR or FEW020CB
  const clouds: DecodedCloudLayer[] = [];
  const cloudRegex = /^(FEW|SCT|BKN|OVC|VV)(\d{3})(CB|TCU)?$/;

  if (hasCavok) {
    clouds.push({
      coverage: 'CLR',
      coverageText: 'Clear sky (CAVOK conditions)',
      heightFt: null,
      heightM: null,
      isCb: false,
      isTcu: false,
      isVerticalVisibility: false
    });
  } else {
    let skiesClear = false;
    for (const tok of tokens) {
      if (tok === 'CLR' || tok === 'SKC' || tok === 'NSC' || tok === 'NCD') {
        skiesClear = true;
        clouds.push({
          coverage: tok as 'CLR' | 'SKC' | 'NSC',
          coverageText: tok === 'CLR' || tok === 'SKC' ? 'Sky Clear — No clouds detected' : 'No significant clouds detected',
          heightFt: null,
          heightM: null,
          isCb: false,
          isTcu: false,
          isVerticalVisibility: false
        });
      }

      const match = tok.match(cloudRegex);
      if (match) {
        const coverage = match[1];
        const heightLevel = parseInt(match[2]);
        const typeNote = match[3];

        const heightFt = heightLevel * 100;
        const heightM = Math.round(heightFt * 0.3048 / 10) * 10;

        let coverageText = '';
        switch (coverage) {
          case 'FEW':
            coverageText = `Few clouds (12-25% coverage) at ${heightFt.toLocaleString()} ft AGL`;
            break;
          case 'SCT':
            coverageText = `Scattered clouds (25-50% coverage) at ${heightFt.toLocaleString()} ft AGL`;
            break;
          case 'BKN':
            coverageText = `Broken cloud layer (50-87% coverage — Ceiling) at ${heightFt.toLocaleString()} ft AGL`;
            break;
          case 'OVC':
            coverageText = `Overcast cloud layer (100% coverage — Ceiling) at ${heightFt.toLocaleString()} ft AGL`;
            break;
          case 'VV':
            coverageText = `Indefinite Ceiling (Vertical Visibility) of ${heightFt.toLocaleString()} ft`;
            break;
        }

        if (typeNote === 'CB') {
          coverageText += ' — Cumulonimbus (TS hazard)';
        } else if (typeNote === 'TCU') {
          coverageText += ' — Towering Cumulus (Turbulence hazard)';
        }

        clouds.push({
          coverage: coverage as any,
          coverageText,
          heightFt,
          heightM,
          isCb: typeNote === 'CB',
          isTcu: typeNote === 'TCU',
          isVerticalVisibility: coverage === 'VV'
        });
      }
    }

    if (clouds.length === 0 && !skiesClear) {
      // Default to clear if nothing matches
      clouds.push({
        coverage: 'CLR',
        coverageText: 'Sky clear of significant clouds',
        heightFt: null,
        heightM: null,
        isCb: false,
        isTcu: false,
        isVerticalVisibility: false
      });
    }
  }

  // 7. Weather Phenomena
  // Codes like -RA, TSRA, FG, BR, etc.
  // These usually don't have numbers (except index numbers) and are separate tokens
  const weatherPhenomena: string[] = [];
  const validCodes = [
    'DZ', 'RA', 'SN', 'SG', 'IC', 'PL', 'GR', 'GS', 'UP', // prec
    'BR', 'FG', 'FU', 'VA', 'DU', 'SA', 'HZ', 'PY',       // obsc
    'PO', 'SQ', 'FC', 'SS', 'DS',                         // other
    'MI', 'PR', 'BC', 'DR', 'BL', 'SH', 'TS', 'FZ'        // descriptors
  ];

  for (const tok of tokens) {
    // Exclude ICAO, Z-time, wind, pressure, altimeter, temp/dewpoint, clouds, RMK
    if (tok === icao || tok === 'METAR' || tok === 'SPECI' || tok === 'AUTO' || tok === 'COR' || tok === 'CAVOK' || tok === 'NIL') continue;
    if (tok.endsWith('Z')) continue;
    if (tok.endsWith('KT') || tok.includes('MPS')) continue;
    if (tok.startsWith('A') && /^\d{4}$/.test(tok.substring(1))) continue;
    if (tok.startsWith('Q') && /^\d{4}$/.test(tok.substring(1))) continue;
    if (/^\d{3}V\d{3}$/.test(tok)) continue; // variable wind range e.g. 200V260
    if (/^(FEW|SCT|BKN|OVC|VV)\d{3}/.test(tok)) continue;
    if (tok === 'CLR' || tok === 'SKC' || tok === 'NSC' || tok === 'NCD') continue;
    if (tok === 'RMK' || tokens.indexOf(tok) >= tokens.indexOf('RMK') && tokens.indexOf('RMK') !== -1) continue;

    // Check temp/dewpoint (e.g. 20/15 or M02/M05)
    if (/^(M?\d{2})\/(M?\d{2})?$/.test(tok)) continue;

    // Check if it's a 4-digit meter visibility
    if (/^\d{4}$/.test(tok)) continue;

    // Now test if it is a match for weather phenomena
    // Some are like -RA, +TSRA, VCSH, etc.
    const cleanTok = tok.replace(/^[+-]/, '').replace(/^VC/, '');
    // Check if any substring of length 2 matches a valid code
    let hasCode = false;
    for (let i = 0; i < cleanTok.length; i += 2) {
      if (validCodes.includes(cleanTok.substring(i, i + 2))) {
        hasCode = true;
        break;
      }
    }

    if (hasCode) {
      weatherPhenomena.push(decodeWeatherCode(tok));
    }
  }

  // 8. Temperature / Dewpoint Group
  let temperature: DecodedTemperature = {
    tempC: 15,
    tempF: 59,
    dewpointC: 10,
    dewpointF: 50,
    spreadC: 5,
    fogRisk: false
  };

  let tempToken = '';
  for (const tok of tokens) {
    const match = tok.match(/^(M?\d{2})\/(M?\d{2})?$/);
    if (match) {
      tempToken = tok;
      const rawTemp = match[1];
      const rawDew = match[2];

      const tempC = rawTemp.startsWith('M') ? -parseInt(rawTemp.substring(1)) : parseInt(rawTemp);
      let dewpointC = tempC; // Fallback if dewpoint missing
      if (rawDew) {
        dewpointC = rawDew.startsWith('M') ? -parseInt(rawDew.substring(1)) : parseInt(rawDew);
      }

      const tempF = Math.round(tempC * 9 / 5 + 32);
      const dewpointF = Math.round(dewpointC * 9 / 5 + 32);
      const spreadC = tempC - dewpointC;
      const fogRisk = spreadC >= 0 && spreadC < 3;

      temperature = {
        tempC,
        tempF,
        dewpointC,
        dewpointF,
        spreadC,
        fogRisk
      };
      break;
    }
  }

  // 9. Pressure / Altimeter Group
  let pressure: DecodedPressure = {
    hPa: 1013,
    inHg: 29.92,
    isStandard: true
  };

  for (const tok of tokens) {
    if (tok.startsWith('A') && /^A\d{4}$/.test(tok)) {
      // US format: e.g. A2992 -> 29.92 inHg
      const inches = parseInt(tok.substring(1)) / 100;
      const hpa = Math.round(inches * 33.8639);
      pressure = {
        hPa: hpa,
        inHg: inches,
        isStandard: Math.abs(inches - 29.92) < 0.02
      };
      break;
    } else if (tok.startsWith('Q') && /^Q\d{4}$/.test(tok)) {
      // International format: e.g. Q1013 -> 1013 hPa
      const hpa = parseInt(tok.substring(1));
      const inches = Math.round(hpa / 33.8639 * 100) / 100;
      pressure = {
        hPa: hpa,
        inHg: inches,
        isStandard: hpa === 1013
      };
      break;
    }
  }

  // 10. Flight Category calculation
  // Find the lowest ceiling in clouds
  let ceilingFt: number | null = null;
  for (const cl of clouds) {
    if ((cl.coverage === 'BKN' || cl.coverage === 'OVC' || cl.coverage === 'VV') && cl.heightFt !== null) {
      if (ceilingFt === null || cl.heightFt < ceilingFt) {
        ceilingFt = cl.heightFt;
      }
    }
  }

  const vis = visibility.distanceSm;
  const ceil = ceilingFt === null ? 99999 : ceilingFt;

  let flightCat: FlightCategoryType = 'VFR';
  if (ceil < 500 || vis < 1) {
    flightCat = 'LIFR';
  } else if (ceil < 1000 || vis < 3) {
    flightCat = 'IFR';
  } else if (ceil <= 3000 || vis <= 5) {
    flightCat = 'MVFR';
  } else {
    flightCat = 'VFR';
  }

  const flightCategory = getFlightCategoryDetails(flightCat);

  // 11. Generate Plain English summary
  let summaryParts: string[] = [];
  
  // Winds
  if (wind.isCalm) {
    summaryParts.push('Winds are calm.');
  } else if (wind.direction === 'VRB') {
    summaryParts.push(`Winds are variable at ${wind.speedKt} knots${wind.gustsKt ? ` with gusts up to ${wind.gustsKt} knots` : ''}.`);
  } else {
    const cardinalDir = wind.directionText.split(' — ')[1] || 'the sector';
    summaryParts.push(`Winds are blowing from ${cardinalDir} at ${wind.speedKt} knots${wind.gustsKt ? ` with gusts up to ${wind.gustsKt} knots` : ''}.`);
  }

  // Visibility
  summaryParts.push(`Visibility is ${visibility.label.toLowerCase()} at ${visibility.distanceSm} statute miles (${visibility.distanceKm} km).`);

  // Weather phenomena
  if (weatherPhenomena.length > 0) {
    summaryParts.push(`Present weather includes: ${weatherPhenomena.join(', ').toLowerCase()}.`);
  }

  // Clouds
  if (clouds.length > 0) {
    const relevantClouds = clouds.filter(cl => cl.coverage !== 'CLR' && cl.coverage !== 'SKC' && cl.coverage !== 'NSC');
    if (relevantClouds.length === 0) {
      summaryParts.push('Sky is clear of significant clouds.');
    } else {
      const layersTxt = relevantClouds.map(cl => {
        const type = cl.coverage === 'FEW' ? 'few' : cl.coverage === 'SCT' ? 'scattered' : cl.coverage === 'BKN' ? 'broken' : cl.coverage === 'OVC' ? 'overcast' : 'indefinite ceiling';
        return `a ${type} layer at ${cl.heightFt?.toLocaleString()} feet`;
      }).join(', ');
      summaryParts.push(`Cloud layers include ${layersTxt}.`);
    }
  }

  // Flight category final summary line
  summaryParts.push(`Overall conditions are ${flightCategory.code}, indicating they are ${flightCategory.code === 'VFR' ? 'suitable for visual flight operations' : flightCategory.code === 'MVFR' ? 'marginal visual flight conditions, student pilots should utilize caution' : 'instrument flight conditions, requiring an IFR rating and flight plan'}.`);

  const summary = summaryParts.join(' ');

  return {
    icao,
    raw: cleanRaw,
    time: {
      day,
      hour: hourStr,
      minute: minStr,
      utcString,
      localString,
      isStale,
      obsTimeEpoch: obsTimeEpoch || Math.floor(Date.now() / 1000)
    },
    wind,
    visibility,
    clouds,
    weatherPhenomena: weatherPhenomena.length > 0 ? weatherPhenomena : ['Clear — No significant weather'],
    temperature,
    pressure,
    flightCategory,
    summary
  };
}
