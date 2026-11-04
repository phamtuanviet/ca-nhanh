import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ApiError, ERRORS, INTERNAL_DB_CODES, errorMessage, fromPostgrest } from '@/lib/errors';

const root = join(__dirname, '..', '..');

/** Bảng mã lỗi trong docs/05-API-Specification.md §9 */
function docCatalog(): { code: string; status: number; message: string }[] {
  const doc = readFileSync(join(root, 'docs', '05-API-Specification.md'), 'utf8');
  const section = doc.slice(doc.indexOf('## 9. Danh mục mã lỗi'), doc.indexOf('## 10.'));
  return [...section.matchAll(/^\| `([A-Z_]+)` \| (\d{3}) \| (.+?) \| [^|]+ \|$/gm)].map((m) => ({
    code: m[1]!,
    status: Number(m[2]),
    // bỏ ghi chú kỹ thuật trong ngoặc, ví dụ "(`details.shortfall`)"
    message: m[3]!.replace(/\s*\(`[^)]*\)$/, '').trim(),
  }));
}

/** Mã lỗi mà các hàm SQL ném ra (RAISE EXCEPTION '<MÃ>') */
function sqlCodes(): string[] {
  const dir = join(root, 'supabase', 'migrations');
  const codes = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const sql = readFileSync(join(dir, file), 'utf8');
    for (const m of sql.matchAll(/raise exception '([A-Z_]+)'/gi)) codes.add(m[1]!);
  }
  return [...codes].sort();
}

describe('danh mục mã lỗi', () => {
  const catalog = docCatalog();

  it('đọc được đủ 47 mã trong tài liệu 05 §9', () => {
    expect(catalog).toHaveLength(47);
  });

  it('khớp tài liệu 05 §9 về mã, HTTP và thông điệp', () => {
    expect(Object.keys(ERRORS).sort()).toEqual(catalog.map((row) => row.code).sort());
    for (const row of catalog) {
      const def = ERRORS[row.code as keyof typeof ERRORS] as {
        status: number;
        message: string;
        template?: string;
      };
      expect(def.status, row.code).toBe(row.status);
      expect(def.template ?? def.message, row.code).toBe(row.message);
    }
  });

  it('mọi mã CSDL ném ra đều có trong danh mục hoặc là lỗi nội bộ', () => {
    const missing = sqlCodes().filter((code) => !(code in ERRORS) && !INTERNAL_DB_CODES.has(code));
    expect(missing).toEqual([]);
  });
});

describe('errorMessage', () => {
  it('điền chi tiết vào template', () => {
    expect(errorMessage('OUT_OF_GEOFENCE', { distance_m: 1474, allowed_m: 160 })).toBe(
      'Bạn đang ở ngoài khu vực quán (cách 1474 m)',
    );
    expect(errorMessage('LEAD_TIME_TOO_SHORT', { min_lead_minutes: 30 })).toBe(
      'Ca phải bắt đầu sau ít nhất 30 phút',
    );
  });

  it('thiếu chi tiết thì dùng câu không có chỗ trống', () => {
    expect(errorMessage('OUT_OF_GEOFENCE')).toBe('Bạn đang ở ngoài khu vực quán');
    expect(errorMessage('ACCOUNT_SUSPENDED', {})).toBe('Bạn đang bị tạm khóa nhận ca');
  });

  it('định dạng thời điểm theo giờ Việt Nam', () => {
    expect(errorMessage('FAVORITES_ONLY', { until: '2026-11-05T10:30:00Z' })).toBe(
      'Ca đang ưu tiên người quen của quán đến 17:30',
    );
  });
});

describe('fromPostgrest', () => {
  it('P0001 với mã đã biết → đúng mã và HTTP', () => {
    const error = fromPostgrest({ code: 'P0001', message: 'SHIFT_FULL' });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('SHIFT_FULL');
    expect(error.status).toBe(409);
    expect(error.message).toBe('Ca vừa đủ người');
  });

  it('P0001 kèm details JSON → giữ details', () => {
    const error = fromPostgrest({
      code: 'P0001',
      message: 'INSUFFICIENT_BALANCE',
      details: '{"shortfall":260000}',
    });
    expect(error.details).toEqual({ shortfall: 260000 });
  });

  it('mã nội bộ hoặc không rõ → 500', () => {
    expect(fromPostgrest({ code: 'P0001', message: 'WALLET_NOT_FOUND' }).code).toBe(
      'INTERNAL_ERROR',
    );
    expect(fromPostgrest({ code: '42501', message: 'permission denied' }).status).toBe(500);
  });

  it('lỗi kiểu dữ liệu, khóa ngoại, CHECK → 400 VALIDATION_ERROR', () => {
    for (const code of ['22P02', '23503', '23514']) {
      expect(fromPostgrest({ code, message: 'x' }).code).toBe('VALIDATION_ERROR');
    }
  });
});
