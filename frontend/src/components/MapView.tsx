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

    // Ładujemy kompletny, czysty styl wektorowy Topo bezpośrednio z serwerów MapTiler
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_KEY}`,
      center: [20.0150, 49.2550], // Centrowanie na Tatry Wysokie i Zachodnie
      zoom: 12.5,
    });

    mapRef.current = map;

    map.on('load', () => {
      // Wstrzykujemy Twoje dane przestrzenne z PostGIS jako nowe źródło na mapie wektorowej
      map.addSource('tatry-trails', {
        type: 'geojson',
        data: 'http://localhost:8080/api/trails',
      });

      // Warstwa bazowa szlaków
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

      // Warstwa podświetlenia (glow) po kliknięciu
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

      // Zmiana zachowania kursora
      map.on('mouseenter', 'trails-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'trails-layer', () => {
        map.getCanvas().style.cursor = '';
      });

      // Kliknięcie w szlak (zwraca pełną relację jako jeden obiekt)
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
    <div className="relative w-full h-[65vh] rounded-2xl border-2 border-retro-green overflow-hidden shadow-lg">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};