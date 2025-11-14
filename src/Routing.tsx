import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";

import type { LatLngExpression } from "leaflet";

type RoutingProps = {
  start: LatLngExpression;
  end: LatLngExpression;
};

// Creating a custom component because react-leaflet-routing-machine
// isn't a simple component to use directly.
function Routing({ start, end }: RoutingProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Create the routing control and add it to the map
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start as L.LatLngTuple),
        L.latLng(end as L.LatLngTuple),
      ],
      routeWhileDragging: true,
      show: false,
      lineOptions: {
        styles: [{ color: "#4f102f", opacity: 0.8, weight: 6 }],
        addWaypoints: false,
        extendToWaypoints: false,
        missingRouteStyles: [{ color: "4f102f", opacity: 0.6, weight: 6, dashArray: "5,10" }],
        missingRouteTolerance: 0,
      },
    }).addTo(map);

    // This is the cleanup function:
    // It runs when the component is unmounted (e.g., we pick a new route)
    return () => {
      map.removeControl(routingControl);
    };
  }, [map, start, end]); // Re-run if map, start, or end changes

  return null; // This component doesn't render any of its own HTML
}

export default Routing;
