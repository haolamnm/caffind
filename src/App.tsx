import { useState, useEffect, useCallback } from "react";
import { LatLng } from "leaflet";
import Map from "./Map";
import SearchBar from "./SearchBar";
import WeatherPanel from "./WeatherPanel";
import { AuthProvider } from "./AuthContext";
import { AuthModal } from "./AuthModal";
import { UserMenu } from "./UserMenu";
import "./App.css";
import { translateText } from "./utils/translate";

import type { LatLngExpression } from "leaflet";

export interface Cafe {
  id: number;
  lat: number;
  lon: number;
  name: string;
  description: string;
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags: {
    name?: string;
    [key: string]: string | undefined;
  };
}

export interface WeatherData {
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  city?: string;
}

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009]; // HCMC
const DEFAULT_TRANSLATE_LANG =
  import.meta.env.VITE_DEFAULT_TRANSLATE_LANG || "vi";
const AMENITY_FILTERS = [
  "cafe",
  "coffee_shop",
  "bar",
  "biergarten",
  "milk_tea_shop",
  "milk-tea shop",
  "restaurant;cafe",
  "cafe;restaurant",
  "tea",
  "tea_room",
];

const buildAmenitySelectors = (
  radius: number,
  lat: number,
  lng: number,
) =>
  AMENITY_FILTERS.map(
    (amenity) => `
        nwr["amenity"="${amenity}"](around:${radius},${lat},${lng});
      `,
  ).join("");

const buildCafeDescription = (tags: OverpassElement["tags"]) => {
  const explicit = tags.description?.trim() || tags["short_description"]?.trim();
  if (explicit) {
    return explicit;
  }

  const addressParts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:district"],
    tags["addr:city"],
  ].filter(Boolean);
  const address = addressParts.join(", ");

  const fragments: string[] = [];
  if (address) {
    fragments.push(`Located at ${address}`);
  }

  const cuisine = tags.cuisine
    ?.split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
  if (cuisine) {
    fragments.push(`Serves ${cuisine}`);
  }

  const amenities: string[] = [];
  if (tags["internet_access"] === "yes") {
    amenities.push("Wi-Fi available");
  } else if (tags["internet_access"] && tags["internet_access"] !== "no") {
    amenities.push(`Wi-Fi ${tags["internet_access"]}`);
  }

  if (tags["outdoor_seating"] === "yes") {
    amenities.push("Outdoor seating");
  }

  if (amenities.length) {
    fragments.push(amenities.join(", "));
  }

  if (tags["opening_hours"]) {
    fragments.push(`Hours: ${tags["opening_hours"]}`);
  }

  const summary = fragments.join(" · ");
  return summary || "Local coffee hangout";
};

function App() {
  const [searchCenter, setSearchCenter] =
    useState<LatLngExpression>(DEFAULT_CENTER);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [routeDestination, setRouteDestination] = useState<LatLng | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [areUtilitiesVisible, setAreUtilitiesVisible] = useState(true);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchCafes = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    setCafes([]);

    const radius = 1000;
    const query = `
      [out:json][timeout:25];(
${buildAmenitySelectors(radius, lat, lng)}
      ); out center;
    `;

    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });
      const raw = await response.text();

      if (!response.ok) {
        throw new Error(
          `Overpass request failed: ${response.status} ${response.statusText} - ${raw.slice(0, 200)}`,
        );
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch (parseError) {
        console.error("Overpass returned invalid JSON payload", parseError, raw.slice(0, 200));
        throw new Error("Overpass returned invalid JSON payload");
      }
      const cafeList: Cafe[] = data.elements.map((el: OverpassElement) => ({
        id: el.id,
        lat: el.lat || el.center!.lat,
        lon: el.lon || el.center!.lon,
        name: el.tags.name || "Coffee Shop",
        description: buildCafeDescription(el.tags),
      }));
      setCafes(cafeList);
    } catch (error) {
      console.error("Failed to fetch cafes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setIsWeatherLoading(true);
    const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

    if (!apiKey) {
      setWeather(null);
      setWeatherError("Missing OpenWeather API key");
      setIsWeatherLoading(false);
      return;
    }

    setWeatherError(null);

    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      units: "metric",
      appid: apiKey,
    });

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`Weather request failed: ${response.status}`);
      }

      const payload = await response.json();
      const weatherEntry = payload.weather?.[0];

      setWeather({
        temp: payload.main?.temp ?? 0,
        feelsLike: payload.main?.feels_like ?? 0,
        description: weatherEntry?.description ?? "Unavailable",
        icon: weatherEntry?.icon ?? "",
        humidity: payload.main?.humidity ?? 0,
        windSpeed: payload.wind?.speed ?? 0,
        city: payload.name,
      });
    } catch (error) {
      console.error("Failed to fetch weather:", error);
      setWeather(null);
      setWeatherError("Unable to load weather data");
    } finally {
      setIsWeatherLoading(false);
    }
  }, []);

  const refreshLocationData = useCallback(
    (lat: number, lon: number) => {
      setSearchCenter([lat, lon]);
      fetchCafes(lat, lon);
      fetchWeather(lat, lon);
    },
    [fetchCafes, fetchWeather],
  );

  const handleTranslateRequest = useCallback(async (text: string) => {
    setIsTranslating(true);
    setTranslationError(null);
    try {
      const translated = await translateText(text, {
        target: DEFAULT_TRANSLATE_LANG,
      });
      setTranslation(translated);
    } catch (error) {
      console.error("Failed to translate text:", error);
      setTranslation(null);
      setTranslationError(
        error instanceof Error
          ? error.message
          : "Unable to translate text right now",
      );
    } finally {
      setIsTranslating(false);
    }
  }, []);

  useEffect(() => {
    refreshLocationData(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        refreshLocationData(latitude, longitude);
      },
      (err) => {
        console.warn(`ERROR(${err.code}): ${err.message}`);
        refreshLocationData(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    );
  }, [refreshLocationData]);

  const handleSearch = (lat: number, lon: number) => {
    refreshLocationData(lat, lon);
  };

  const handleMapClick = (lat: number, lon: number) => {
    setRouteDestination(null);
    refreshLocationData(lat, lon);
  };

  const handleSetRoute = (cafe: Cafe) => {
    setRouteDestination(new LatLng(cafe.lat, cafe.lon));
  };

  return (
    <AuthProvider>
      <div className="App">
        <div className="app-header">
          <UserMenu onOpenAuth={() => setIsAuthModalOpen(true)} />
        </div>

        <button
          type="button"
          className={`utility-toggle ${areUtilitiesVisible ? "is-open" : ""}`}
          aria-label="Toggle search and weather panels"
          aria-pressed={areUtilitiesVisible}
          onClick={() => setAreUtilitiesVisible((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className={`utility-panel ${areUtilitiesVisible ? "is-visible" : "is-hidden"}`}
          aria-hidden={!areUtilitiesVisible}
        >
          <WeatherPanel
            weather={weather}
            isLoading={isWeatherLoading}
            error={weatherError}
          />
          <SearchBar
            onSearch={handleSearch}
            isLoading={isLoading}
            onTranslate={handleTranslateRequest}
            translatedText={translation}
            translationError={translationError}
            isTranslating={isTranslating}
            targetLanguage={DEFAULT_TRANSLATE_LANG}
          />
        </div>

        <Map
          searchCenter={searchCenter}
          cafes={cafes}
          onLocationSelect={handleMapClick}
          routeDestination={routeDestination}
          onSetRoute={handleSetRoute}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    </AuthProvider>
  );
}

export default App;
