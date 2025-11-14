import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import { Icon } from 'leaflet';
import Routing from './Routing';

import type { LatLngExpression } from 'leaflet';
import type { Cafe } from './App';

// Pans the map when searchCenter changes
function ChangeView({ center }: { center: LatLngExpression }) {
  const map = useMap();
  map.flyTo(center, map.getZoom() < 13 ? 13 : map.getZoom()); // Smoothly fly
  return null;
}

// Reports map clicks back to App.tsx
function ClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const cafeIcon = new Icon({
  iconUrl: 'https://emojicdn.elk.sh/☕',
  iconSize: [32, 32],
});

const searchIcon = new Icon({
  iconUrl: 'https://emojicdn.elk.sh/📍',
  iconSize: [32, 32],
});

// Props that Map.tsx now expects
type MapProps = {
  searchCenter: LatLngExpression;
  cafes: Cafe[];
  onLocationSelect: (lat: number, lon: number) => void;
  routeDestination: LatLngExpression | null;
  onSetRoute: (cafe: Cafe) => void;
};

// --- Main Map Component ---
function Map({ searchCenter, cafes, onLocationSelect, routeDestination, onSetRoute }: MapProps) {
  const routeButtonStyle = {
    backgroundColor: '#0078A8',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px',
    width: '100%'
  };

  return (
    <MapContainer
      className="map-container"
      center={searchCenter}
      zoom={15}
      scrollWheelZoom={true}
    >
      {/* This component makes the map pan when searchCenter changes */}
      <ChangeView center={searchCenter} />

      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* This component reports clicks back to App.tsx */}
      <ClickHandler onLocationSelect={onLocationSelect} />

      {/* The single marker for the search location */}
      <Marker position={searchCenter} icon={searchIcon}>
        <Popup>Search Location</Popup>
      </Marker>

      {/* Render all the cafes */}
      {cafes.map((cafe) => (
        <Marker key={cafe.id} position={[cafe.lat, cafe.lon]} icon={cafeIcon}>
          <Popup>
            {/* Cafe name */}
            <strong style={{fontSize: '16px'}}>{cafe.name}</strong>
            <br />
            {/* Get Directions Button */}
            <button
              style={routeButtonStyle}
              onClick={() => {
                onSetRoute(cafe);
              }}
            >
              Get Directions
            </button>
          </Popup>
        </Marker>
      ))}

      {/* Conditionally render the Routing component */}
      {routeDestination && (
        <Routing start={searchCenter} end={routeDestination} />
      )}
    </MapContainer>
  );
}

export default Map;
