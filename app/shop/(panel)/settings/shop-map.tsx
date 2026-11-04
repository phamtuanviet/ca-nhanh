'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

// Ghim dựng bằng CSS (không cần ảnh marker mặc định của Leaflet)
const pin = L.divIcon({
  className: '',
  html: '<span class="cn-map-pin" aria-hidden="true"></span>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
  }, [lat, lng, map]);
  return null;
}

function ClickToMove({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Bản đồ ghim vị trí quán và vòng bán kính chấm công (P1-12) */
export default function ShopMap({
  lat,
  lng,
  radius,
  onChange,
}: {
  lat: number;
  lng: number;
  radius: number;
  onChange: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom={false}
      className="h-72 w-full rounded-[var(--radius-control)]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Circle
        center={[lat, lng]}
        radius={radius}
        pathOptions={{ color: '#2D58F2', weight: 2, fillOpacity: 0.12 }}
      />
      <Marker
        position={[lat, lng]}
        icon={pin}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const p = (e.target as L.Marker).getLatLng();
            onChange(p.lat, p.lng);
          },
        }}
      />
      <Recenter lat={lat} lng={lng} />
      <ClickToMove onChange={onChange} />
    </MapContainer>
  );
}
