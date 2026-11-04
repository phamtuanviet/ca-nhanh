import photos from '@/design/assets/photos/photos.json';

type Variant = { file: string; width: number; height: number; bytes: number };
type PhotoMeta = {
  name: string;
  kind: 'wide' | 'cover';
  alt: string;
  blurDataURL: string;
  variants: Variant[];
};

const BY_NAME = new Map((photos as PhotoMeta[]).map((p) => [p.name, p]));

/** Ảnh đã nén sẵn trong design/assets/photos (được chép sang /photos). Chọn bản WebP gần cỡ mong muốn. */
export function photo(name: string, width = 960) {
  const meta = BY_NAME.get(name);
  if (!meta) throw new Error(`Không có ảnh "${name}" trong photos.json`);
  const webp = meta.variants
    .filter((v) => v.file.endsWith('.webp'))
    .sort((a, b) => Math.abs(a.width - width) - Math.abs(b.width - width))[0];
  if (!webp) throw new Error(`Ảnh "${name}" thiếu bản WebP`);
  return {
    src: `/photos/${webp.file}`,
    width: webp.width,
    height: webp.height,
    alt: meta.alt,
    blurDataURL: meta.blurDataURL,
  };
}
