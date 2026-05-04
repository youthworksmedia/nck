export type WeatherProvider = "YR" | "BOM";

export type ProviderMetadata = {
  provider: WeatherProvider;
  label: string;
  attribution: string;
  attributionUrl: string;
};

export type LocationRecord = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  favorited: boolean;
  userId: string;
  createdAt?: string;
};

export type ForecastRecord = {
  id?: string;
  locationId?: string;
  provider: WeatherProvider;
  forecastForDate: string;
  predictedTemp: number | null;
  predictedRain: number | null;
  predictedWind: number | null;
  rawData?: unknown;
  createdAt?: string;
};

export type ObservationRecord = {
  id?: string;
  locationId?: string;
  observedDate: string;
  actualTemp: number | null;
  actualRain: number | null;
  actualWind: number | null;
  rawData?: unknown;
  createdAt?: string;
};

export type AccuracyScore = {
  provider: WeatherProvider;
  tempAccuracy: number;
  rainAccuracy: number;
  combinedScore: number;
  sampleSize: number;
  lastUpdated: string;
};

export type ForecastBundle = {
  provider: ProviderMetadata;
  current: {
    temperature: number | null;
    rain: number | null;
    wind: number | null;
    summary: string;
    asOf: string | null;
  };
  daily: ForecastRecord[];
};

export type PlaceSearchResult = {
  id: string;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type WeatherSettings = {
  units: "metric" | "imperial";
  preferredProvider: "auto" | WeatherProvider;
  offlineCaching: boolean;
};

export type WeatherResponse = {
  location: {
    name?: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  providers: ForecastBundle[];
  requestedAt: string;
};

export type FavoriteSummary = {
  location: LocationRecord;
  providers: ForecastBundle[];
  accuracy: AccuracyScore[];
};
