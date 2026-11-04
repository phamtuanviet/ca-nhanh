// Chép asset của hệ thiết kế (design/assets) sang public/ trước khi chạy dev hoặc build.
// design/assets là nguồn duy nhất; bản trong public/ bị .gitignore bỏ qua.
// Đồng thời sinh components/cn/illustrations.generated.ts để chèn minh họa trực tiếp vào trang
// (màu đổi theo theme). File sinh ra được commit; chạy lại script khi đổi minh họa.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const groups = ['brand', 'photos', 'illustrations', 'avatars'];

mkdirSync(join(root, 'public'), { recursive: true });
for (const group of groups) {
  const from = join(root, 'design', 'assets', group);
  if (!existsSync(from)) throw new Error(`Thiếu thư mục asset: ${from}`);
  cpSync(from, join(root, 'public', group), { recursive: true });
}

const illustrationDir = join(root, 'design', 'assets', 'illustrations');
const entries = readdirSync(illustrationDir)
  .filter((file) => file.endsWith('.svg'))
  .sort()
  .map((file) => {
    const svg = readFileSync(join(illustrationDir, file), 'utf8');
    const open = svg.match(/<svg\b[^>]*>/);
    if (!open) throw new Error(`Không đọc được thẻ <svg> trong ${file}`);
    const viewBox = open[0].match(/viewBox="([^"]+)"/)?.[1];
    const label = open[0].match(/aria-label="([^"]+)"/)?.[1] ?? '';
    const inner = svg.slice(open.index + open[0].length, svg.lastIndexOf('</svg>')).trim();
    return [file.replace(/\.svg$/, ''), { viewBox, label, inner }];
  });
const moduleSource = `// Sinh tự động bởi scripts/sync-assets.mjs từ design/assets/illustrations. Không sửa tay.
export const ILLUSTRATIONS = ${JSON.stringify(Object.fromEntries(entries), null, 2)} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;
`;
const target = join(root, 'components', 'cn', 'illustrations.generated.ts');
mkdirSync(dirname(target), { recursive: true });
const previous = existsSync(target) ? readFileSync(target, 'utf8') : '';
if (previous !== moduleSource) writeFileSync(target, moduleSource);

console.log(
  `sync-assets: đã chép ${groups.join(', ')} sang public/ và sinh ${entries.length} minh họa`,
);
