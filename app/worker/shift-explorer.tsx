'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Crosshair, List, Map as MapIcon, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { EmptyState } from '@/components/cn/empty-state';
import { LivePulse } from '@/components/cn/live-pulse';
import { ShiftTicket } from '@/components/cn/shift-ticket';
import { Skeleton } from '@/components/cn/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DISTRICTS } from '@/lib/geo';
import { apiList } from '@/lib/http';
import { useRealtime } from '@/lib/realtime/use-realtime';

type Position = { code: string; name: string };
type Item = {
  shift_id: string;
  shop_id: string;
  shop_name: string;
  shop_rating: number;
  lat: number | null;
  lng: number | null;
  shop_cover_url: string | null;
  title: string;
  start_at: string;
  end_at: string;
  hourly_rate: number;
  est_earning: number;
  distance_m: number;
  headcount: number;
  filled_count: number;
  is_urgent: boolean;
};
type Place = { lat: number; lng: number; label: string; gps: boolean };

// Leaflet chỉ chạy ở trình duyệt: nạp động khi người dùng chuyển sang bản đồ
const ShiftMap = dynamic(() => import('@/components/worker/shift-map'), {
  ssr: false,
  loading: () => <div className="cn-skel h-[60dvh] min-h-80 rounded-[var(--radius-card)]" />,
});

const DAYS = [
  { value: 'week', label: '7 ngày tới' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'tomorrow', label: 'Ngày mai' },
];
const RATES = [
  { value: '0', label: 'Mọi mức lương' },
  { value: '30000', label: 'Từ 30.000đ/giờ' },
  { value: '35000', label: 'Từ 35.000đ/giờ' },
  { value: '40000', label: 'Từ 40.000đ/giờ' },
];
const RADII = ['1', '3', '5', '10', '20'];
const SORTS = [
  { value: 'match', label: 'Phù hợp nhất' },
  { value: 'distance', label: 'Gần nhất' },
  { value: 'start_time', label: 'Sớm nhất' },
  { value: 'rate', label: 'Lương cao' },
];
const PAGE = 20;
const STORAGE_KEY = 'cn:place';

function subscribeStorage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function readSavedDistrict(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Khoảng giờ bắt đầu theo ngày (giờ Việt Nam) */
function dayRange(day: string): { from?: string; to?: string } {
  if (day === 'week') return {};
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const start = new Date(`${today}T00:00:00+07:00`);
  if (day === 'tomorrow') start.setTime(start.getTime() + 86_400_000);
  const end = new Date(start.getTime() + 86_400_000);
  return { from: (day === 'today' ? new Date() : start).toISOString(), to: end.toISOString() };
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9 shrink-0 rounded-full bg-surface text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ShiftExplorer({ positions }: { positions: Position[] }) {
  const queryClient = useQueryClient();
  // Vị trí: quận đã chọn lần trước (localStorage) → GPS → quận mặc định khi bị từ chối
  const saved = useSyncExternalStore(subscribeStorage, readSavedDistrict, () => null);
  const [choice, setChoice] = useState<string | null>(null); // 'gps' hoặc tên quận chọn trong phiên này
  const [gps, setGps] = useState<Place | null>(null);
  const [gpsState, setGpsState] = useState<'pending' | 'denied' | 'done'>('pending');
  const [day, setDay] = useState('week');
  const [position, setPosition] = useState('all');
  const [minRate, setMinRate] = useState('0');
  const [radius, setRadius] = useState('5');
  const [sort, setSort] = useState('match');
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const [view, setView] = useState<'list' | 'map'>('list');
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function requestGps() {
    if (!('geolocation' in navigator)) {
      void Promise.resolve().then(() => setGpsState('denied'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Vị trí của bạn',
          gps: true,
        });
        setGpsState('done');
      },
      () => setGpsState('denied'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }

  // Lần đầu chưa từng chọn quận: xin quyền vị trí
  useEffect(() => {
    if (!saved) requestGps();
  }, [saved]);

  function pickDistrict(name: string) {
    setChoice(name);
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {}
  }

  function pickGps() {
    setChoice('gps');
    setGpsState('pending');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    requestGps();
  }

  const districtPlace = (name: string | null): Place | null => {
    const d = DISTRICTS.find((x) => x.name === name);
    return d ? { lat: d.lat, lng: d.lng, label: d.name, gps: false } : null;
  };
  const fallback = districtPlace(DISTRICTS[0]!.name);
  const place: Place | null =
    choice === 'gps'
      ? (gps ?? (gpsState === 'denied' ? fallback : null))
      : (districtPlace(choice) ??
        districtPlace(saved) ??
        gps ??
        (gpsState === 'denied' ? fallback : null));
  const locating = gpsState === 'pending' && (choice === 'gps' || (!choice && !saved));

  const params = useMemo(() => {
    if (!place) return null;
    const q = new URLSearchParams({
      lat: place.lat.toFixed(5),
      lng: place.lng.toFixed(5),
      radius_km: radius,
      sort,
      limit: String(PAGE),
    });
    const range = dayRange(day);
    if (range.from) q.set('from', range.from);
    if (range.to) q.set('to', range.to);
    if (position !== 'all') q.set('positions', position);
    if (minRate !== '0') q.set('min_rate', minRate);
    return q;
  }, [place, radius, sort, day, position, minRate]);

  const query = useInfiniteQuery({
    queryKey: ['shifts', params?.toString()],
    enabled: params !== null,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      apiList<Item>(`/shifts?${params!.toString()}&page=${pageParam}`, signal),
    getNextPageParam: (last, pages) =>
      pages.length * PAGE < last.meta.total ? pages.length + 1 : undefined,
  });

  // Ca mới đăng hoặc thay đổi số chỗ: làm mới danh sách (gộp sự kiện dồn dập trong 400 ms)
  const status = useRealtime({
    channel: 'shift-feed',
    table: 'shifts',
    onChange: (payload) => {
      const row = payload.new as { id?: string; status?: string };
      if (payload.eventType === 'INSERT' && row.id && row.status === 'open') {
        setNewIds((ids) => new Set(ids).add(row.id!));
      }
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(
        () => void queryClient.invalidateQueries({ queryKey: ['shifts'] }),
        400,
      );
    },
  });

  const items = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="grid gap-1">
          <h1 className="text-2xl leading-8 font-bold tracking-tight">Khám phá ca</h1>
          <LivePulse
            status={status}
            label={query.isSuccess ? `Đang tuyển · ${total} ca gần bạn` : 'Đang tải ca gần bạn'}
          />
        </div>
        <div
          role="group"
          aria-label="Cách xem"
          className="inline-flex rounded-[var(--radius-control)] bg-surface-sunken p-1"
        >
          {(
            [
              { key: 'list', label: 'Danh sách', Icon: List },
              { key: 'map', label: 'Bản đồ', Icon: MapIcon },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[calc(var(--radius-control)-4px)] px-3 text-sm font-medium text-text-muted aria-pressed:bg-surface aria-pressed:text-text aria-pressed:shadow-sm"
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
        <Select
          value={place?.gps ? 'gps' : (place?.label ?? '')}
          onValueChange={(v) => (v === 'gps' ? pickGps() : pickDistrict(v))}
        >
          <SelectTrigger
            aria-label="Khu vực"
            className="h-9 min-w-0 rounded-full bg-surface text-sm"
          >
            <SelectValue placeholder={locating ? 'Đang lấy vị trí…' : 'Chọn khu vực'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gps">Vị trí của bạn</SelectItem>
            {DISTRICTS.map((d) => (
              <SelectItem key={d.name} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={pickGps}
          aria-label="Dùng vị trí hiện tại"
          disabled={locating}
        >
          <Crosshair />
        </Button>
      </div>

      <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1">
        <FilterSelect label="Ngày" value={day} onChange={setDay} options={DAYS} />
        <FilterSelect
          label="Vị trí"
          value={position}
          onChange={setPosition}
          options={[
            { value: 'all', label: 'Mọi vị trí' },
            ...positions.map((p) => ({ value: p.code, label: p.name })),
          ]}
        />
        <FilterSelect label="Lương" value={minRate} onChange={setMinRate} options={RATES} />
        <FilterSelect
          label="Bán kính"
          value={radius}
          onChange={setRadius}
          options={RADII.map((r) => ({ value: r, label: `Trong ${r} km` }))}
        />
        <FilterSelect label="Sắp xếp" value={sort} onChange={setSort} options={SORTS} />
      </div>

      {query.isError ? (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] bg-danger-soft px-4 py-3 text-sm text-on-danger-soft"
        >
          {(query.error as Error).message}
        </p>
      ) : null}

      {!place || query.isPending ? (
        <Skeleton shape="ticket" count={3} />
      ) : items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-card)]">
          <EmptyState
            illustration="empty-shifts"
            title={`Chưa có ca nào trong ${radius} km`}
            text="Ca mới sẽ tự hiện ở đây ngay khi quán đăng, không cần tải lại trang."
          >
            {Number(radius) < 20 ? (
              <Button
                className="mt-2"
                onClick={() => setRadius(String(Math.min(Number(radius) * 2, 20)))}
              >
                Tìm trong {Math.min(Number(radius) * 2, 20)} km
              </Button>
            ) : null}
          </EmptyState>
        </div>
      ) : view === 'map' ? (
        <div className="grid gap-2">
          <ShiftMap
            center={{ lat: place.lat, lng: place.lng, label: place.label }}
            radiusKm={Number(radius)}
            shifts={items}
          />
          <p className="text-xs text-text-muted">
            {items.length < total
              ? `Đang hiện ${items.length}/${total} ca. Xem thêm ở chế độ danh sách.`
              : `${items.length} ca trong ${radius} km.`}{' '}
            Bấm ghim để xem ca của quán.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4" aria-live="polite">
          {items.map((item) => (
            <li key={item.shift_id}>
              <ShiftTicket
                href={`/worker/shifts/${item.shift_id}`}
                transitionName={`shift-${item.shift_id}`}
                shopName={item.shop_name}
                shopLogoUrl={item.shop_cover_url}
                shopRating={item.shop_rating || null}
                title={item.title}
                startAt={item.start_at}
                endAt={item.end_at}
                hourlyRate={item.hourly_rate}
                estEarning={item.est_earning}
                distanceM={item.distance_m}
                headcount={item.headcount}
                filledCount={item.filled_count}
                isUrgent={item.is_urgent}
                deposited
                isNew={newIds.has(item.shift_id)}
              />
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage ? (
        <Button
          variant="outline"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm ca'}
        </Button>
      ) : null}
    </div>
  );
}
