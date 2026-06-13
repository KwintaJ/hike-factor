import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '../store/useMapStore';

const MAPTILER_KEY = 'Gu0T2JgGU5nLV4tlm7UY'; 

export const MapView: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const setSelectedTrailId = useMapStore((state) => state.setSelectedTrailId);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_KEY}`,
      center: [19.9464, 49.2602],
      zoom: 12,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.addSource('tatry-trails', {
        type: 'geojson',
        data: 'http://localhost:8080/api/trails',
      });

      map.addLayer({
        id: 'trails-layer',
        type: 'line',
        source: 'tatry-trails',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#7C3AED'],
          'line-width': 4,
        },
      });

      map.addLayer({
        id: 'trails-highlight',
        type: 'line',
        source: 'tatry-trails',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#7C3AED'],
          'line-width': 8,
          'line-opacity': 0.4,
        },
        filter: ['==', ['get', 'id'], ''],
      });

      map.on('mouseenter', 'trails-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'trails-layer', () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('click', 'trails-layer', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const id = feature.properties?.id;
          
          if (id) {
            setSelectedTrailId(Number(id));
            map.setFilter('trails-highlight', ['==', ['get', 'id'], Number(id)]);
          }
        }
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [setSelectedTrailId]);

  return (
    <div className="relative w-full h-[42vh] rounded-2xl border-2 border-retro-green overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};