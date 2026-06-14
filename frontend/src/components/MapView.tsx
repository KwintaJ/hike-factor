import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../store/useMapStore';

const MAPTILER_KEY = 'Gu0T2JgGU5nLV4tlm7UY'; 

export const MapView: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  
  const geoJsonData = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const setSelectedTrailId = useMapStore((state) => state.setSelectedTrailId);
  const selectedTrailId = useMapStore((state) => state.selectedTrailId);
  const isAuthView = useMapStore((state) => state.isAuthView);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_KEY}`,
      center: [19.9464, 49.2602],
      zoom: 12,
    });

    mapRef.current = map;

    map.on('load', async () => {
      try {
        const response = await fetch('http://localhost:8080/api/trails');
        const data = await response.json();
        geoJsonData.current = data;

        map.addSource('tatry-trails', {
          type: 'geojson',
          data: data,
        });

        map.addLayer({
          id: 'trails-layer',
          type: 'line',
          source: 'tatry-trails',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
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
          filter: ['==', ['get', 'id'], selectedTrailId || ''], 
        });

        map.on('mouseenter', 'trails-layer', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'trails-layer', () => {
          map.getCanvas().style.cursor = '';
        });

        map.on('click', 'trails-layer', (e) => {
          if (e.features && e.features.length > 0) {
            const id = e.features[0].properties?.id;
            if (id) {
              setSelectedTrailId(Number(id));
            }
          }
        });

        setIsMapLoaded(true);
      } catch (err) {
        console.error('Błąd wczytywania szlaków:', err);
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [setSelectedTrailId]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    const map = mapRef.current;

    if (selectedTrailId === null) {
      map.setFilter('trails-highlight', ['==', ['get', 'id'], '']);
    } else {
      map.setFilter('trails-highlight', ['==', ['get', 'id'], selectedTrailId]);
    }

    setTimeout(() => {
      map.resize();

      if (selectedTrailId !== null && geoJsonData.current) {
        const feature = geoJsonData.current.features.find(
          (f: any) => f.properties.id === selectedTrailId
        );

        if (feature && feature.geometry) {
          const isMulti = feature.geometry.type === 'MultiLineString';
          const coords = isMulti 
            ? feature.geometry.coordinates.flat() 
            : feature.geometry.coordinates;

          let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
          coords.forEach((coord: number[]) => {
            if (coord[0] < minLng) minLng = coord[0];
            if (coord[1] < minLat) minLat = coord[1];
            if (coord[0] > maxLng) maxLng = coord[0];
            if (coord[1] > maxLat) maxLat = coord[1];
          });

          map.fitBounds(
            [[minLng, minLat], [maxLng, maxLat]],
            { padding: 40, duration: 800, maxZoom: 14 }
          );
        }
      }
    }, 500);
  }, [selectedTrailId, isMapLoaded]);

  const isMapCollapsed = selectedTrailId !== null || isAuthView;

  return (
    <div className={`relative w-full transition-all duration-500 ease-in-out ${
      isMapCollapsed ? 'h-[42vh]' : 'h-[84vh]'
    } rounded-2xl border-2 border-retro-green overflow-hidden shadow-lg`}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};