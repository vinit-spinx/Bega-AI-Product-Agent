'use client';
import { useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { scaleSqrt } from 'd3-scale';
import { geoCentroid } from 'd3-geo';

// Public, static world topology — standard CDN source used by react-simple-maps examples.
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export interface MapCity {
  city: string;
  country: string;
  lat: number;
  lon: number;
  count: number;
}

interface Position {
  coordinates: [number, number];
  zoom: number;
}

const DEFAULT_POSITION: Position = { coordinates: [0, 12], zoom: 1 };

export default function WorldMap({ cities, height = 320 }: { cities: MapCity[]; height?: number }) {
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const maxCount = Math.max(1, ...cities.map(c => c.count));
  const radius = scaleSqrt().domain([1, maxCount]).range([2, 6]);
  const zoomedIn = position.zoom !== DEFAULT_POSITION.zoom || position.coordinates[0] !== DEFAULT_POSITION.coordinates[0] || position.coordinates[1] !== DEFAULT_POSITION.coordinates[1];

  return (
    <div style={{ height }} className="w-full relative">
      {zoomedIn && (
        <button
          type="button"
          onClick={() => setPosition(DEFAULT_POSITION)}
          className="absolute top-1 right-1 z-10 text-[10px] font-medium px-2.5 py-1 rounded-full
                     bg-white border border-bega-border-2 text-bega-text-2 hover:text-bega-text-1
                     hover:border-bega-border-3 shadow-sm transition-colors"
        >
          Reset zoom
        </button>
      )}
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 120, center: [0, 12] }}
        width={800}
        height={420}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={setPosition}
          minZoom={1}
          maxZoom={8}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => {
                    const centroid = geoCentroid(geo as never) as [number, number];
                    setPosition({ coordinates: centroid, zoom: 4 });
                  }}
                  fill="#EDEAE5"
                  stroke="#D5CFC9"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none', cursor: 'pointer' },
                    hover: { outline: 'none', fill: '#DEDAD5', cursor: 'pointer' },
                    pressed: { outline: 'none', fill: '#D5CFC9' },
                  }}
                />
              ))
            }
          </Geographies>
          {cities.map((c, i) => (
            <Marker key={i} coordinates={[c.lon, c.lat]}>
              <circle r={radius(c.count) / position.zoom} fill="#B5862E" fillOpacity={0.75} stroke="#8C6422" strokeWidth={0.5 / position.zoom}>
                <title>{`${c.city}, ${c.country} — ${c.count} inquir${c.count === 1 ? 'y' : 'ies'}`}</title>
              </circle>
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
}
