import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import { Dream, DreamCategory } from '../types';
import { CATEGORY_COLORS, MAP_TILE_URL, MAP_ATTRIBUTION } from '../constants';

interface DreamMapProps {
  dreams: Dream[];
  filter: DreamCategory | 'ALL';
  onDreamClick: (dream: Dream) => void;
  focusDream: Dream | null;
}

interface SpiderCluster {
  centerDream: Dream;
  legs: {
    dream: Dream;
    position: [number, number]; // LatLng
  }[];
}

// Function to create custom glowing icons
const createGlowingIcon = (color: string, isSpiderfied = false) => {
  if (!L || !L.divIcon) return undefined;

  const size = isSpiderfied ? 20 : 24; // Slightly smaller for spiderfied legs

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="dream-marker-container" style="width: ${size}px; height: ${size}px; color: ${color};">
        <div class="dream-marker-ring"></div>
        <div class="dream-marker-dot"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

// Component to handle Map invalidation and FlyTo animations
const MapController: React.FC<{ focusDream: Dream | null }> = ({ focusDream }) => {
  const map = useMap();
  
  useEffect(() => {
    // Force a resize calculation when the component mounts to prevent gray tiles
    const timer = setTimeout(() => {
        map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (focusDream) {
      map.flyTo([focusDream.location.lat, focusDream.location.lng], 6, {
        duration: 2.5,
        easeLinearity: 0.25
      });
    }
  }, [focusDream, map]);

  return null;
};

// Inner component to handle markers, logic, and spiderfy state using map context
const DreamMarkers: React.FC<{
  dreams: Dream[];
  filter: DreamCategory | 'ALL';
  onDreamClick: (dream: Dream) => void;
}> = ({ dreams, filter, onDreamClick }) => {
  const map = useMap();
  const [spiderCluster, setSpiderCluster] = useState<SpiderCluster | null>(null);

  // Clear spiderfy on zoom, move, or background click
  useMapEvents({
    zoomstart: () => setSpiderCluster(null),
    movestart: () => setSpiderCluster(null),
    click: () => setSpiderCluster(null),
  });

  // Filter dreams based on prop
  const visibleDreams = useMemo(() => {
    if (filter === 'ALL') return dreams;
    return dreams.filter(d => d.category === filter);
  }, [dreams, filter]);

  const handleMarkerClick = (clickedDream: Dream, e: L.LeafletMouseEvent) => {
    // If already in a cluster and clicking a leg, just open it (handled by leg onclick)
    // This handler is for the main markers (clusters or singletons)

    L.DomEvent.stopPropagation(e);
    
    // Project clicked point to container pixels
    const clickedPoint = map.latLngToContainerPoint([clickedDream.location.lat, clickedDream.location.lng]);

    // Find all visible dreams close to this point (e.g., 30px radius)
    const CLUSTER_RADIUS_PX = 30;
    
    const nearbyDreams = visibleDreams.filter(d => {
      // Quick pre-filter by lat/lng to avoid heavy projection math on all points
      if (Math.abs(d.location.lat - clickedDream.location.lat) > 1) return false;
      if (Math.abs(d.location.lng - clickedDream.location.lng) > 1) return false;

      const p = map.latLngToContainerPoint([d.location.lat, d.location.lng]);
      return clickedPoint.distanceTo(p) < CLUSTER_RADIUS_PX;
    });

    if (nearbyDreams.length > 1) {
      // Trigger Spiderfy
      const count = nearbyDreams.length;
      const angleStep = (Math.PI * 2) / count;
      const legLengthPx = 70; // Distance from center

      const legs = nearbyDreams.map((d, index) => {
        const angle = index * angleStep;
        const offsetPoint = L.point(
          clickedPoint.x + legLengthPx * Math.cos(angle),
          clickedPoint.y + legLengthPx * Math.sin(angle)
        );
        const latLng = map.containerPointToLatLng(offsetPoint);
        return {
          dream: d,
          position: [latLng.lat, latLng.lng] as [number, number]
        };
      });

      setSpiderCluster({
        centerDream: clickedDream,
        legs: legs
      });

    } else {
      // It's a single dream, just open it
      onDreamClick(clickedDream);
    }
  };

  return (
    <>
      {/* Render Spiderfied Cluster (Lines & Legs) */}
      {spiderCluster && (
        <>
          {spiderCluster.legs.map((leg) => (
            <React.Fragment key={`spider-line-${leg.dream.id}`}>
              <Polyline
                positions={[
                  [spiderCluster.centerDream.location.lat, spiderCluster.centerDream.location.lng],
                  leg.position
                ]}
                pathOptions={{
                  color: 'white',
                  weight: 1,
                  opacity: 0.3,
                  dashArray: '4 6'
                }}
              />
              <Marker
                position={leg.position}
                icon={createGlowingIcon(CATEGORY_COLORS[leg.dream.category], true)}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    onDreamClick(leg.dream);
                  }
                }}
                riseOnHover={true}
              />
            </React.Fragment>
          ))}
        </>
      )}

      {/* Render Normal Markers */}
      {visibleDreams.map((dream) => {
        // If this dream is currently part of the active spider cluster, hide its original marker
        if (spiderCluster && spiderCluster.legs.some(leg => leg.dream.id === dream.id)) {
          return null;
        }

        const icon = createGlowingIcon(CATEGORY_COLORS[dream.category]);
        if (!icon) return null;

        return (
          <Marker
            key={dream.id}
            position={[dream.location.lat, dream.location.lng]}
            icon={icon}
            eventHandlers={{
              click: (e) => handleMarkerClick(dream, e),
            }}
            riseOnHover={true} // Bring to front on hover
          />
        );
      })}
    </>
  );
};

const DreamMap: React.FC<DreamMapProps> = ({ dreams, filter, onDreamClick, focusDream }) => {
  return (
    <div className="fixed inset-0 z-0 bg-[#0a0a12]">
      <MapContainer
        center={[20, 0]}
        zoom={2.5}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
        style={{ width: '100vw', height: '100vh', background: '#0a0a12' }}
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution={MAP_ATTRIBUTION}
          url={MAP_TILE_URL}
        />
        
        <DreamMarkers 
          dreams={dreams} 
          filter={filter} 
          onDreamClick={onDreamClick} 
        />
        
        <MapController focusDream={focusDream} />
      </MapContainer>
    </div>
  );
};

export default DreamMap;