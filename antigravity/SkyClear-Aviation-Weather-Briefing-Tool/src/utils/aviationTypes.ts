export type FlightCategoryType = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface DecodedWind {
  direction: number | 'VRB';
  directionText: string;
  speedKt: number;
  gustsKt?: number;
  isCalm: boolean;
  colorClass: string; // green, amber, red
}

export interface DecodedVisibility {
  distanceSm: number;
  distanceKm: number;
  label: 'Excellent' | 'Good' | 'Moderate' | 'Poor' | 'Very Poor';
  colorClass: string;
}

export interface DecodedCloudLayer {
  coverage: 'FEW' | 'SCT' | 'BKN' | 'OVC' | 'CLR' | 'SKC' | 'NSC' | 'VV';
  coverageText: string;
  heightFt: number | null;
  heightM: number | null;
  isCb: boolean;
  isTcu: boolean;
  isVerticalVisibility: boolean;
}

export interface DecodedTemperature {
  tempC: number;
  tempF: number;
  dewpointC: number;
  dewpointF: number;
  spreadC: number;
  fogRisk: boolean;
}

export interface DecodedPressure {
  hPa: number;
  inHg: number;
  isStandard: boolean;
}

export interface FlightCategoryDetails {
  code: FlightCategoryType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  explanation: string;
}

export interface DecodedMETAR {
  icao: string;
  raw: string;
  time: {
    day: number;
    hour: string;
    minute: string;
    utcString: string;
    localString: string;
    isStale: boolean;
    obsTimeEpoch: number;
  };
  wind: DecodedWind;
  visibility: DecodedVisibility;
  clouds: DecodedCloudLayer[];
  weatherPhenomena: string[];
  temperature: DecodedTemperature;
  pressure: DecodedPressure;
  flightCategory: FlightCategoryDetails;
  summary: string;
}

export interface TAFPeriod {
  type: 'FM' | 'BECMG' | 'TEMPO' | 'PROB30' | 'PROB40' | 'BASE' | 'PROB30 TEMPO' | 'PROB40 TEMPO';
  timeStart: string; // display string
  timeEnd: string;   // display string
  rawText: string;
  wind?: DecodedWind;
  visibility?: DecodedVisibility;
  clouds: DecodedCloudLayer[];
  weatherPhenomena: string[];
  flightCategory: FlightCategoryDetails;
  summary: string;
  epochStart?: number;
}

export interface DecodedTAF {
  icao: string;
  raw: string;
  issueTime: string;
  validFrom: string;
  validTo: string;
  periods: TAFPeriod[];
}

export interface BriefingData {
  metar: DecodedMETAR;
  taf: DecodedTAF | null;
  timestamp: string;
}
