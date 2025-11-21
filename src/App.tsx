import { useState, useEffect, useCallback } from "react";
import { LatLng } from "leaflet";
import Map from "./Map";
import SearchBar from "./SearchBar";
import WeatherPanel from "./WeatherPanel";
import "./App.css";

import type { LatLngExpression } from "leaflet";

export interface Cafe {
  id: number;
  lat: number;
  lon: number;
  name: string;
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

function App() {
  const [searchCenter, setSearchCenter] =
    useState<LatLngExpression>(DEFAULT_CENTER);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [routeDestination, setRouteDestination] = useState<LatLng | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const fetchCafes = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    setCafes([]);

    const radius = 1000;
    const query = `
      [out:json];(
        node["amenity"="cafe"](around:${radius},${lat},${lng});
        way["amenity"="cafe"](around:${radius},${lat},${lng});
        relation["amenity"="cafe"](around:${radius},${lat},${lng});
        node["amenity"="coffee_shop"](around:${radius},${lat},${lng});
        way["amenity"="coffee_shop"](around:${radius},${lat},${lng});
        relation["amenity"="coffee_shop"](around:${radius},${lat},${lng});
      ); out center;
    `;

    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });
      const data = await response.json();
      const cafeList: Cafe[] = data.elements.map((el: OverpassElement) => ({
        id: el.id,
        lat: el.lat || el.center!.lat,
        lon: el.lon || el.center!.lon,
        name: el.tags.name || "Coffee Shop",
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
    <div className="App">
      <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      <WeatherPanel
        weather={weather}
        isLoading={isWeatherLoading}
        error={weatherError}
      />
      <Map
        searchCenter={searchCenter}
        cafes={cafes}
        onLocationSelect={handleMapClick}
        routeDestination={routeDestination}
        onSetRoute={handleSetRoute}
      />
    </div>
  );
}

export default App;
