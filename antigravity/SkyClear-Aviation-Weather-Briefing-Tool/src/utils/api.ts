import { BriefingData } from './aviationTypes';
import { decodeMETAR } from './metarDecoder';
import { decodeTAF } from './tafDecoder';

export async function fetchAviationBriefing(icaoCode: string): Promise<BriefingData> {
  const cleanIcao = icaoCode.trim().toUpperCase();
  
  if (!cleanIcao || cleanIcao.length < 3 || cleanIcao.length > 4) {
    throw new Error('Please enter a valid 3 or 4-letter airport ICAO code.');
  }

  // Ensure 4 letters (e.g., JFK -> KJFK)
  const queryIcao = cleanIcao.length === 3 ? `K${cleanIcao}` : cleanIcao;

  const metarUrl = `/api/metar?ids=${queryIcao}&format=json`;
  const tafUrl = `/api/taf?ids=${queryIcao}&format=json`;

  try {
    // Fetch METAR with a 15-second timeout
    const metarController = new AbortController();
    const metarTimeout = setTimeout(() => metarController.abort(), 15000);
    
    let metarResponse;
    try {
      metarResponse = await fetch(metarUrl, { signal: metarController.signal });
    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw new Error('Connection timed out while fetching METAR data. Please check your network.');
      }
      throw e;
    } finally {
      clearTimeout(metarTimeout);
    }

    if (!metarResponse.ok) {
      throw new Error(`Aviation Weather Service returned an error (${metarResponse.status}) for METAR.`);
    }

    const metarJson = await metarResponse.json();
    if (!Array.isArray(metarJson) || metarJson.length === 0) {
      throw new Error(`Airport ICAO "${queryIcao}" was not found or has no current METAR observation. Please try another code (e.g., KJFK, EGLL, WSSS, OMDB).`);
    }

    const metarRecord = metarJson[0];
    const rawMetar = metarRecord.rawOb || metarRecord.raw || '';
    if (!rawMetar) {
      throw new Error(`No raw METAR data available for "${queryIcao}".`);
    }

    const obsTimeEpoch = metarRecord.obsTime || null;
    const decodedMetar = decodeMETAR(rawMetar, obsTimeEpoch);

    // Fetch TAF with a 15-second timeout (TAF is optional; if it fails, we still show the METAR!)
    let decodedTaf = null;
    try {
      const tafController = new AbortController();
      const tafTimeout = setTimeout(() => tafController.abort(), 15000);
      
      const tafResponse = await fetch(tafUrl, { signal: tafController.signal });
      clearTimeout(tafTimeout);

      if (tafResponse.ok) {
        const tafJson = await tafResponse.json();
        if (Array.isArray(tafJson) && tafJson.length > 0) {
          const tafRecord = tafJson[0];
          const rawTaf = tafRecord.rawTAF || tafRecord.raw || '';
          if (rawTaf) {
            decodedTaf = decodeTAF(rawTaf);
          }
        }
      }
    } catch (tafError) {
      console.warn('Failed to load TAF data (non-blocking):', tafError);
      // TAF is secondary, so we don't crash if TAF fails.
    }

    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return {
      metar: decodedMetar,
      taf: decodedTaf,
      timestamp
    };
  } catch (error: any) {
    throw new Error(error.message || 'An unexpected error occurred while loading aviation weather data.');
  }
}
