import { DecodedTAF, TAFPeriod, FlightCategoryType } from './aviationTypes';
import { decodeMETAR, getFlightCategoryDetails } from './metarDecoder';

export function decodeTAF(raw: string): DecodedTAF | null {
  if (!raw) return null;

  const cleanRaw = raw.replace(/\s+/g, ' ').trim().toUpperCase();
  const tokens = cleanRaw.split(' ');

  // 1. Station ICAO
  let icaoIndex = 0;
  if (tokens[0] === 'TAF' || tokens[0] === 'AMD' || tokens[0] === 'COR') {
    icaoIndex = tokens[0] === 'TAF' ? 1 : (tokens[1] === 'TAF' ? 2 : 1);
  }
  const icao = tokens[icaoIndex] || 'UNKNOWN';

  // 2. Issue Time
  let issueTimeToken = '';
  for (let i = icaoIndex + 1; i < Math.min(icaoIndex + 4, tokens.length); i++) {
    if (tokens[i].endsWith('Z') && /^\d{6}Z$/.test(tokens[i])) {
      issueTimeToken = tokens[i];
      break;
    }
  }

  let issueTimeDisplay = 'Unknown Issue Time';
  if (issueTimeToken) {
    const day = issueTimeToken.substring(0, 2);
    const hour = issueTimeToken.substring(2, 4);
    const min = issueTimeToken.substring(4, 6);
    issueTimeDisplay = `Day ${day} @ ${hour}:${min} UTC`;
  }

  // 3. Validity Period
  // Format e.g. 2512/2618 (From 25th day 12:00 UTC to 26th day 18:00 UTC)
  let validToken = '';
  for (let i = icaoIndex + 1; i < Math.min(icaoIndex + 5, tokens.length); i++) {
    if (/^\d{4}\/\d{4}$/.test(tokens[i])) {
      validToken = tokens[i];
      break;
    }
  }

  let validFrom = 'Unknown';
  let validTo = 'Unknown';
  if (validToken) {
    const fromParts = validToken.split('/')[0];
    const toParts = validToken.split('/')[1];
    validFrom = `Day ${fromParts.substring(0, 2)} @ ${fromParts.substring(2, 4)}:00 UTC`;
    validTo = `Day ${toParts.substring(0, 2)} @ ${toParts.substring(2, 4)}:00 UTC`;
  }

  // 4. Split into Periods
  // Look for keywords: FM\d{6}, TEMPO, BECMG, PROB30, PROB40
  // We want to slice the TAF tokens into sections.
  const periodKeywords = ['TEMPO', 'BECMG', 'PROB30', 'PROB40'];
  const periodsData: { prefix: string; contentTokens: string[] }[] = [];

  // Let's group tokens. The first group is "BASE" (from start up to the first keyword or FM)
  let currentGroupPrefix = 'BASE';
  let currentGroupTokens: string[] = [];

  for (let i = icaoIndex + 1; i < tokens.length; i++) {
    const tok = tokens[i];
    
    // Check if it's FM\d{6}
    const isFM = /^FM\d{6}$/.test(tok);
    
    // Handle PROB30/PROB40 TEMPO combinations
    const isProb = tok.startsWith('PROB');
    const nextTok = tokens[i + 1];
    
    if (isProb && nextTok === 'TEMPO') {
      // Save current group before starting a new one
      if (currentGroupTokens.length > 0) {
        periodsData.push({
          prefix: currentGroupPrefix,
          contentTokens: currentGroupTokens
        });
      }
      currentGroupPrefix = `${tok} TEMPO`;
      currentGroupTokens = [];
      i++; // Skip the TEMPO token
      continue;
    }

    const isKeyword = periodKeywords.includes(tok) || isFM;

    if (isKeyword) {
      // Save current group before starting a new one
      if (currentGroupTokens.length > 0) {
        periodsData.push({
          prefix: currentGroupPrefix,
          contentTokens: currentGroupTokens
        });
      }
      
      currentGroupPrefix = tok;
      currentGroupTokens = [];
    } else {
      // Filter out header tokens (issue time/validity period) from BASE group
      if (currentGroupPrefix === 'BASE') {
        if (tok.endsWith('Z') || /^\d{4}\/\d{4}$/.test(tok)) {
          continue;
        }
      }
      currentGroupTokens.push(tok);
    }
  }

  // Add the last group
  if (currentGroupTokens.length > 0) {
    periodsData.push({
      prefix: currentGroupPrefix,
      contentTokens: currentGroupTokens
    });
  }

  // Let's decode each group
  const periods: TAFPeriod[] = [];
  
  // Keep track of active parameters to inherit them if a group doesn't specify them (e.g. TEMPO inherits base wind/vis)
  let lastActiveWind: any = null;
  let lastActiveVisibility: any = null;
  let lastActiveClouds: any[] = [];
  let lastActivePhenomena: any[] = [];

  for (let idx = 0; idx < periodsData.length; idx++) {
    const { prefix, contentTokens } = periodsData[idx];
    
    // Determine type
    let type: TAFPeriod['type'] = 'BASE';
    let timeStart = '';
    let timeEnd = '';
    let epochStart: number | undefined;

    if (prefix === 'BASE') {
      type = 'BASE';
      timeStart = validFrom;
      timeEnd = validTo;
    } else if (prefix.startsWith('FM')) {
      type = 'FM';
      const fmTime = prefix.substring(2); // e.g. 251800 -> Day 25, 18:00
      const day = fmTime.substring(0, 2);
      const hour = fmTime.substring(2, 4);
      const min = fmTime.substring(4, 6);
      timeStart = `Day ${day} @ ${hour}:${min} UTC`;

      // Find the next FM or BASE period start time to set as timeEnd, or default to validTo
      let nextFMStart = '';
      for (let j = idx + 1; j < periodsData.length; j++) {
        if (periodsData[j].prefix.startsWith('FM')) {
          const nextFMTime = periodsData[j].prefix.substring(2);
          nextFMStart = `Day ${nextFMTime.substring(0, 2)} @ ${nextFMTime.substring(2, 4)}:${nextFMTime.substring(4, 6)} UTC`;
          break;
        }
      }
      timeEnd = nextFMStart || validTo;

      // Calculate pseudo-epoch start
      const now = new Date();
      const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), parseInt(day), parseInt(hour), parseInt(min)));
      epochStart = Math.floor(utcDate.getTime() / 1000);
    } else if (prefix === 'TEMPO' || prefix === 'BECMG' || prefix.startsWith('PROB')) {
      type = prefix.startsWith('PROB') ? (prefix as any) : (prefix as any);
      
      // The first content token for TEMPO/BECMG/PROB is usually the time period e.g. 2512/2515
      // If so, parse it and remove it from contentTokens
      let timeRangeToken = '';
      if (contentTokens.length > 0 && /^\d{4}\/\d{4}$/.test(contentTokens[0])) {
        timeRangeToken = contentTokens[0];
        contentTokens.shift(); // remove time token so it's not parsed as visibility/clouds
      }

      if (timeRangeToken) {
        const fromParts = timeRangeToken.split('/')[0];
        const toParts = timeRangeToken.split('/')[1];
        timeStart = `Day ${fromParts.substring(0, 2)} @ ${fromParts.substring(2, 4)}:00 UTC`;
        timeEnd = `Day ${toParts.substring(0, 2)} @ ${toParts.substring(2, 4)}:00 UTC`;

        const now = new Date();
        const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), parseInt(fromParts.substring(0, 2)), parseInt(fromParts.substring(2, 4)), 0));
        epochStart = Math.floor(utcDate.getTime() / 1000);
      } else {
        timeStart = validFrom;
        timeEnd = validTo;
      }
    }

    // Now, decode content tokens by building a mock METAR string
    // e.g. "KJFK 250000Z " + contentTokens.join(" ")
    const mockMetarText = `${icao} 250000Z ${contentTokens.join(' ')}`;
    const decodedMock = decodeMETAR(mockMetarText);

    // Save and inherit
    if (type === 'BASE' || type === 'FM') {
      lastActiveWind = decodedMock.wind;
      lastActiveVisibility = decodedMock.visibility;
      lastActiveClouds = decodedMock.clouds;
      lastActivePhenomena = decodedMock.weatherPhenomena;
    }

    // Resolve wind, visibility, clouds, weatherPhenomena for this period
    // If it's TEMPO/BECMG and has no specified winds, visibility or clouds, inherit from the last active FM/BASE
    const hasWind = contentTokens.some(t => t.endsWith('KT') || t.includes('MPS'));
    const hasVis = contentTokens.some(t => t.endsWith('SM') || /^\d{4}$/.test(t) || t === 'CAVOK');
    const hasClouds = contentTokens.some(t => /^(FEW|SCT|BKN|OVC|VV)\d{3}/.test(t) || t === 'CLR' || t === 'SKC' || t === 'NSC' || t === 'CAVOK');

    const resolvedWind = hasWind ? decodedMock.wind : (lastActiveWind || decodedMock.wind);
    const resolvedVis = hasVis ? decodedMock.visibility : (lastActiveVisibility || decodedMock.visibility);
    const resolvedClouds = hasClouds ? decodedMock.clouds : (lastActiveClouds || decodedMock.clouds);
    const resolvedPhenomena = decodedMock.weatherPhenomena.length > 0 && decodedMock.weatherPhenomena[0] !== 'Clear — No significant weather'
      ? decodedMock.weatherPhenomena
      : (type === 'TEMPO' || type.startsWith('PROB') ? decodedMock.weatherPhenomena : (lastActivePhenomena || decodedMock.weatherPhenomena));

    // Calculate flight category for this specific period
    let ceilingFt: number | null = null;
    for (const cl of resolvedClouds) {
      if ((cl.coverage === 'BKN' || cl.coverage === 'OVC' || cl.coverage === 'VV') && cl.heightFt !== null) {
        if (ceilingFt === null || cl.heightFt < ceilingFt) {
          ceilingFt = cl.heightFt;
        }
      }
    }

    const visSm = resolvedVis.distanceSm;
    const ceil = ceilingFt === null ? 99999 : ceilingFt;
    let flightCat: FlightCategoryType = 'VFR';
    if (ceil < 500 || visSm < 1) {
      flightCat = 'LIFR';
    } else if (ceil < 1000 || visSm < 3) {
      flightCat = 'IFR';
    } else if (ceil <= 3000 || visSm <= 5) {
      flightCat = 'MVFR';
    } else {
      flightCat = 'VFR';
    }

    const flightCategory = getFlightCategoryDetails(flightCat);

    // Create a plain English period text
    let periodSummary = '';
    let prefixLabel = '';
    if (type === 'BASE') {
      prefixLabel = 'Initial condition';
    } else if (type === 'FM') {
      prefixLabel = 'From this time onward';
    } else if (type === 'TEMPO') {
      prefixLabel = 'Temporarily';
    } else if (type === 'BECMG') {
      prefixLabel = 'Gradually becoming';
    } else if (type === 'PROB30') {
      prefixLabel = 'Probability 30%';
    } else if (type === 'PROB40') {
      prefixLabel = 'Probability 40%';
    } else if (type === 'PROB30 TEMPO') {
      prefixLabel = 'Probability 30% (Temporarily)';
    } else if (type === 'PROB40 TEMPO') {
      prefixLabel = 'Probability 40% (Temporarily)';
    } else {
      prefixLabel = `Condition ${type}`;
    }

    const summaryParts: string[] = [];
    if (resolvedWind.isCalm) {
      summaryParts.push('winds are calm');
    } else if (resolvedWind.direction === 'VRB') {
      summaryParts.push(`winds variable at ${resolvedWind.speedKt} kt`);
    } else {
      const card = resolvedWind.directionText.split(' — ')[1] || 'the sector';
      summaryParts.push(`winds from ${card.toLowerCase()} at ${resolvedWind.speedKt} kt${resolvedWind.gustsKt ? ` gusting to ${resolvedWind.gustsKt} kt` : ''}`);
    }

    summaryParts.push(`visibility ${resolvedVis.label.toLowerCase()} (${resolvedVis.distanceSm} SM)`);

    if (resolvedPhenomena.length > 0 && resolvedPhenomena[0] !== 'Clear — No significant weather') {
      summaryParts.push(`weather: ${resolvedPhenomena.join(', ').toLowerCase()}`);
    }

    if (resolvedClouds.length > 0) {
      const cloudDesc = resolvedClouds.map(cl => {
        if (cl.coverage === 'CLR' || cl.coverage === 'SKC' || cl.coverage === 'NSC') return 'sky clear';
        const typeStr = cl.coverage === 'FEW' ? 'few' : cl.coverage === 'SCT' ? 'scattered' : cl.coverage === 'BKN' ? 'broken' : cl.coverage === 'OVC' ? 'overcast' : 'indefinite ceiling';
        return `${typeStr} at ${cl.heightFt?.toLocaleString()} ft`;
      }).join(', ');
      summaryParts.push(`clouds: ${cloudDesc}`);
    }

    periodSummary = `${prefixLabel}: ${summaryParts.join(', ')}.`;

    periods.push({
      type,
      timeStart,
      timeEnd,
      rawText: `${prefix} ${contentTokens.join(' ')}`,
      wind: resolvedWind,
      visibility: resolvedVis,
      clouds: resolvedClouds,
      weatherPhenomena: resolvedPhenomena,
      flightCategory,
      summary: periodSummary,
      epochStart
    });
  }

  return {
    icao,
    raw: cleanRaw,
    issueTime: issueTimeDisplay,
    validFrom,
    validTo,
    periods
  };
}
