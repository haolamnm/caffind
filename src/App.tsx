import { useState, useEffect } from "react";
import { LatLng } from "leaflet";
import Map from "./Map";
import SearchBar from "./SearchBar";
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

function App() {
  const defaultPosition: LatLngExpression = [10.7769, 106.7009]; // HCMC

  // All the state now lives in App.tsx
  const [searchCenter, setSearchCenter] =
    useState<LatLngExpression>(defaultPosition);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start true on first load
  const [routeDestination, setRouteDestination] = useState<LatLng | null>(null);

  // Effect to get GPS location on load
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSearchCenter([latitude, longitude]); // This triggers the cafe search
      },
      (err) => {
        console.warn(`ERROR(${err.code}): ${err.message}`);
        setSearchCenter(defaultPosition); // Triggers search at default
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    );
  }, []); // Runs once on load

  // Effect to fetch cafes when searchCenter changes
  useEffect(() => {
    // Type guard
    if (!Array.isArray(searchCenter)) return;

    const [lat, lng] = searchCenter;
    fetchCafes(lat, lng);
  }, [searchCenter]); // Runs every time searchCenter changes!

  // The fetch function (moved from Map.tsx)
  const fetchCafes = async (lat: number, lng: number) => {
    setIsLoading(true);
    setCafes([]); // Clear old cafes

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
        lat: el.lat || el.center!.lat, // 'way' uses 'center.lat'
        lon: el.lon || el.center!.lon, // 'way' uses 'center.lon'
        name: el.tags.name || "Coffee Shop",
      }));
      setCafes(cafeList);
    } catch (error) {
      console.error("Failed to fetch cafes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers to pass down to children

  // For the SearchBar
  const handleSearch = (lat: number, lon: number) => {
    setSearchCenter([lat, lon]);
  };

  // For the Map (clicking)
  const handleMapClick = (lat: number, lon: number) => {
    setSearchCenter([lat, lon]);
    setRouteDestination(null);
  };

  const handleSetRoute = (cafe: Cafe) => {
    setRouteDestination(new LatLng(cafe.lat, cafe.lon));
  };

  return (
    <div className="App">
      <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      <Map
        searchCenter={searchCenter}
        cafes={cafes}
        onLocationSelect={handleMapClick}
        // NEW: Pass down the new state and handler
        routeDestination={routeDestination}
        onSetRoute={handleSetRoute}
      />
    </div>
  );
}

export default App;
