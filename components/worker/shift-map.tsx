'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { fmtDay, fmtRange, vnd } from '@/lib/format';

export type MapShift = {
  shift_id: string;
  shop_id: string;
  shop_name: string;
  lat: number | null;
  lng: number | null;
  title: string;
  start_at: string;
  end_at: string;
  est_earning: number;
  is_urgent: boolean;
  headcount: number;
  filled_count: number;
};

// Leaflet gán màu qua thuộc tính SVG nên không đọc được biến CSS: dùng mã màu primary của hệ thiết kế
const PRIMARY = '#2D58F2';

/** "150k", "1,2tr" cho nhãn ghim */
function shortMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`;
  return `${Math.round(n / 1000)}k`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function FitToRadius({ lat, lng, radiusM }: { lat: number; lng: number; radiusM: number }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLng(lat, lng).toBounds(radiusM * 2), { animate: false, padding: [12, 12] });
  }, [lat, lng, radiusM, map]);
  return null;
}

/**
 * Bản đồ ca (W3, P3-01, US-20): mỗi quán một ghim ghi tiền công cao nhất, ca gấp màu nghệ; bấm ghim
 * mở danh sách ca của quán. Vòng tròn là bán kính đang tìm, chấm xanh là vị trí của bạn.
 */
export default function ShiftMap({
  center,
  radiusKm,
  shifts,
}: {
  center: { lat: number; lng: number; label: string };
  radiusKm: number;
  shifts: MapShift[];
}) {
  const shops = useMemo(() => {
    const byShop = new Map<string, MapShift[]>();
    for (const s of shifts) {
      if (s.lat === null || s.lng === null) continue;
      byShop.set(s.shop_id, [...(byShop.get(s.shop_id) ?? []), s]);
    }
    return [...byShop.values()].map((list) => ({
      list: list.sort((a, b) => a.start_at.localeCompare(b.start_at)),
      urgent: list.some((s) => s.is_urgent),
      top: Math.max(...list.map((s) => s.est_earning)),
    }));
  }, [shifts]);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      scrollWheelZoom
      className="h-[60dvh] min-h-80 w-full rounded-[var(--radius-card)] shadow-[var(--shadow-card)]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToRadius lat={center.lat} lng={center.lng} radiusM={radiusKm * 1000} />
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: PRIMARY, weight: 1, fillOpacity: 0.05 }}
      />
      <CircleMarker
        center={[center.lat, center.lng]}
        radius={7}
        pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: PRIMARY, fillOpacity: 1 }}
      >
        <Popup>{center.label}</Popup>
      </CircleMarker>
      {shops.map(({ list, urgent, top }) => {
        const first = list[0];
        const label = `${shortMoney(top)}${list.length > 1 ? ` · ${list.length} ca` : ''}`;
        const icon = L.divIcon({
          className: '',
          html: `<span class="cn-map-shift${urgent ? ' cn-map-shift--urgent' : ''}">${escapeHtml(label)}</span>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        return (
          <Marker
            key={first.shop_id}
            position={[first.lat!, first.lng!]}
            icon={icon}
            title={`${first.shop_name}: ${list.length} ca`}
            alt={`${first.shop_name}: ${list.length} ca`}
          >
            <Popup>
              <div className="grid min-w-52 gap-2 font-sans">
                <strong className="text-sm">{first.shop_name}</strong>
                <ul className="grid gap-1.5">
                  {list.map((s) => (
                    <li key={s.shift_id}>
                      <Link
                        href={`/worker/shifts/${s.shift_id}`}
                        className="grid rounded-md px-1 py-0.5 text-[13px] no-underline hover:bg-black/5"
                      >
                        <span className="font-semibold text-[#151B2A]">
                          {s.is_urgent ? '⚡ ' : ''}
                          {s.title}
                        </span>
                        <span className="text-[#51596B]">
                          {fmtRange(s.start_at, s.end_at)} {fmtDay(s.start_at)} · {vnd(s.est_earning)} ·{' '}
                          {s.filled_count}/{s.headcount}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
