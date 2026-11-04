'use client';

import { Crosshair, Plus, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/cn/badge';
import { PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DISTRICTS } from '@/lib/geo';
import { api, ApiClientError } from '@/lib/http';

// Leaflet chỉ chạy ở trình duyệt và khá nặng: nạp động, chỉ ở trang này (06 §7)
const ShopMap = dynamic(() => import('./shop-map'), {
  ssr: false,
  loading: () => <div className="cn-skel h-72 rounded-[var(--radius-control)]" />,
});

const CATEGORIES = [
  { value: 'cafe', label: 'Cà phê' },
  { value: 'milk_tea', label: 'Trà sữa' },
  { value: 'restaurant', label: 'Nhà hàng, quán ăn' },
  { value: 'bakery', label: 'Tiệm bánh' },
  { value: 'bar', label: 'Bar, pub' },
  { value: 'fast_food', label: 'Đồ ăn nhanh' },
  { value: 'other', label: 'Khác' },
];

type ShopForm = {
  id: string;
  name: string;
  category: string;
  address: string;
  district: string;
  phone: string;
  description: string;
  geofence_radius_m: number;
  lat: number | null;
  lng: number | null;
  verification_status: string;
};

type SearchResult = { display_name: string; lat: string; lon: string };

export function ShopEditor({
  shops,
  shop,
}: {
  shops: { id: string; name: string }[];
  shop: ShopForm | null;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(shop?.category ?? 'cafe');
  const [radius, setRadius] = useState(shop?.geofence_radius_m ?? 150);
  const [pos, setPos] = useState({
    lat: shop?.lat ?? DISTRICTS[0]!.lat,
    lng: shop?.lng ?? DISTRICTS[0]!.lng,
  });
  const [pinned, setPinned] = useState(Boolean(shop?.lat));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const lastSearch = useRef(0);
  const addressRef = useRef<HTMLInputElement>(null);

  function move(lat: number, lng: number) {
    setPos({ lat, lng });
    setPinned(true);
  }

  /** Lấy GPS của thiết bị. Quán đã có thì lưu ngay (để geofence khớp nơi đang đứng khi demo). */
  function placeHere() {
    if (!('geolocation' in navigator)) {
      toast.error('Trình duyệt không hỗ trợ định vị');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        move(p.coords.latitude, p.coords.longitude);
        setLocating(false);
        if (shop) {
          try {
            await api(`/shops/${shop.id}`, {
              method: 'PATCH',
              body: { lat: p.coords.latitude, lng: p.coords.longitude },
            });
            toast.success('Đã đặt vị trí quán tại đây', {
              description: `Sai số GPS khoảng ${Math.round(p.coords.accuracy)} m`,
            });
            router.refresh();
          } catch (err) {
            toast.error(err instanceof ApiClientError ? err.message : 'Không lưu được vị trí');
          }
        }
      },
      () => {
        setLocating(false);
        toast.error('Không lấy được vị trí. Hãy cho phép quyền vị trí hoặc kéo ghim trên bản đồ.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  /** Tìm địa chỉ bằng Nominatim: chỉ khi bấm Tìm, tối đa 1 yêu cầu/giây (chính sách sử dụng của OSM) */
  async function search() {
    const text = query.trim();
    if (text.length < 3 || Date.now() - lastSearch.current < 1100) return;
    lastSearch.current = Date.now();
    setSearching(true);
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.search = new URLSearchParams({
        q: text,
        format: 'jsonv2',
        countrycodes: 'vn',
        limit: '5',
        'accept-language': 'vi',
      }).toString();
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      setResults(res.ok ? ((await res.json()) as SearchResult[]) : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    if (!pinned) {
      setError('Ghim vị trí quán trên bản đồ (hoặc bấm "Đặt vị trí quán tại đây")');
      return;
    }
    const body = {
      name: text('name'),
      category,
      address: text('address'),
      district: text('district') || null,
      phone: text('phone') || null,
      description: text('description') || null,
      geofence_radius_m: radius,
      lat: Number(pos.lat.toFixed(6)),
      lng: Number(pos.lng.toFixed(6)),
    };
    setSaving(true);
    setError(null);
    try {
      if (shop) {
        await api(`/shops/${shop.id}`, { method: 'PATCH', body });
        toast.success('Đã lưu thông tin quán');
        router.refresh();
      } else {
        const created = await api<{ id: string; verification_status: string }>('/shops', { body });
        toast.success(
          created.verification_status === 'verified'
            ? 'Đã tạo quán, có thể đăng ca ngay'
            : 'Đã tạo quán, chờ duyệt',
        );
        router.replace(`/shop/settings?shop=${created.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không lưu được, thử lại sau');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={shop ? 'Quán' : 'Tạo quán'}
        description="Thông tin quán và vị trí chấm công"
        actions={
          shop ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/shop/settings?new=1">
                <Plus aria-hidden /> Thêm quán
              </Link>
            </Button>
          ) : null
        }
      />

      {shops.length > 1 || (!shop && shops.length > 0) ? (
        <nav aria-label="Chọn quán" className="mb-4 flex flex-wrap gap-2">
          {shops.map((s) => (
            <Link
              key={s.id}
              href={`/shop/settings?shop=${s.id}`}
              aria-current={shop?.id === s.id ? 'page' : undefined}
              className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium aria-[current=page]:border-primary aria-[current=page]:bg-primary-soft aria-[current=page]:text-on-primary-soft"
            >
              {s.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <form
        onSubmit={save}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        noValidate
      >
        <section className="grid content-start gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          {shop ? (
            <div>
              {shop.verification_status === 'verified' ? (
                <Badge tone="deposit" icon="shield-check">
                  Đã duyệt, đăng ca được
                </Badge>
              ) : (
                <Badge tone="warn" icon="clock">
                  Đang chờ duyệt
                </Badge>
              )}
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="name">Tên quán</Label>
            <Input
              id="name"
              name="name"
              defaultValue={shop?.name}
              required
              minLength={2}
              maxLength={120}
              className="h-11"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shop-category">Loại quán</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="shop-category" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Input
              id="address"
              name="address"
              ref={addressRef}
              defaultValue={shop?.address}
              required
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="district">Quận</Label>
              <Input
                id="district"
                name="district"
                defaultValue={shop?.district}
                list="districts"
                className="h-11"
              />
              <datalist id="districts">
                {DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">SĐT quán</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={shop?.phone}
                className="h-11"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Giới thiệu (không bắt buộc)</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={shop?.description}
              rows={3}
              maxLength={1000}
              className="rounded-[var(--radius-control)] border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </section>

        <section className="grid content-start gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-card)]">
          <div className="grid gap-1">
            <h2 className="font-semibold">Vị trí chấm công</h2>
            <p className="text-sm text-text-muted">
              Kéo ghim hoặc bấm vào bản đồ. Người làm chỉ check-in được trong vòng tròn.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void search();
                }
              }}
              placeholder="Tìm địa chỉ, ví dụ 144 Xuân Thủy"
              aria-label="Tìm địa chỉ"
              className="h-10"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={search}
              disabled={searching}
            >
              <Search aria-hidden /> {searching ? 'Đang tìm' : 'Tìm'}
            </Button>
          </div>
          {results ? (
            results.length === 0 ? (
              <p className="text-sm text-text-muted">
                Không tìm thấy địa chỉ, thử ghi rõ hơn hoặc kéo ghim.
              </p>
            ) : (
              <ul className="grid gap-1">
                {results.map((r) => (
                  <li key={`${r.lat},${r.lon}`}>
                    <button
                      type="button"
                      className="w-full rounded-[var(--radius-control)] px-2 py-1.5 text-left text-sm hover:bg-surface-sunken"
                      onClick={() => {
                        move(Number(r.lat), Number(r.lon));
                        if (addressRef.current && !addressRef.current.value) {
                          addressRef.current.value = r.display_name
                            .split(',')
                            .slice(0, 2)
                            .join(',');
                        }
                        setResults(null);
                      }}
                    >
                      {r.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
          <ShopMap lat={pos.lat} lng={pos.lng} radius={radius} onChange={move} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="secondary" onClick={placeHere} disabled={locating}>
              <Crosshair aria-hidden /> {locating ? 'Đang lấy vị trí…' : 'Đặt vị trí quán tại đây'}
            </Button>
            <span className="text-xs text-text-muted">
              {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
            </span>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="radius">
              Bán kính chấm công: <span className="cn-num text-base">{radius} m</span>
            </Label>
            <input
              id="radius"
              type="range"
              min={30}
              max={500}
              step={10}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="accent-[var(--primary)]"
            />
          </div>
        </section>

        <div className="grid gap-3 lg:col-span-2">
          {error ? (
            <p
              role="alert"
              className="rounded-[var(--radius-control)] bg-danger-soft px-4 py-3 text-sm text-on-danger-soft"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={saving} className="w-full sm:w-fit">
            {saving ? 'Đang lưu…' : shop ? 'Lưu thông tin quán' : 'Tạo quán'}
          </Button>
        </div>
      </form>
    </>
  );
}
