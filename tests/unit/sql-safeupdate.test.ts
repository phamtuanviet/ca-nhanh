import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Supabase nạp pg_safeupdate cho request qua PostgREST: UPDATE/DELETE không có WHERE bị chặn
// ("UPDATE requires a WHERE clause"), kể cả bên trong hàm SECURITY DEFINER gọi bằng RPC.
// Bộ kiểm thử SQL chạy bằng psql nên không bắt được lỗi này; kiểm tĩnh ở đây.

const dir = join(__dirname, '..', '..', 'supabase', 'migrations');

function statementsWithoutWhere(sql: string): string[] {
  const code = sql.replace(/--[^\n]*/g, '');
  const offenders: string[] = [];
  for (const match of code.matchAll(/\b(update|delete\s+from)\s+(?:public\.)?[a-z_]+\b[^;]*;/gi)) {
    const statement = match[0];
    const before = code.slice(Math.max(0, match.index - 20), match.index).toLowerCase();
    // Bỏ qua "for update", "do update set", "before/after update on" (trigger), "update of" (khóa dòng)
    if (/(for|do|before|after|or)\s+$/.test(before)) continue;
    if (/^update\s+(on|of|set|skip)\b/i.test(statement)) continue;
    if (!/\bwhere\b/i.test(statement)) offenders.push(statement.split('\n')[0]!.trim());
  }
  return offenders;
}

describe('migration tương thích pg_safeupdate', () => {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    it(`${file}: mọi UPDATE/DELETE đều có WHERE`, () => {
      expect(statementsWithoutWhere(readFileSync(join(dir, file), 'utf8'))).toEqual([]);
    });
  }

  it('phát hiện được câu lệnh vi phạm', () => {
    expect(
      statementsWithoutWhere('begin; update public.wallets set balance = 0; end;'),
    ).toHaveLength(1);
    expect(
      statementsWithoutWhere('select 1 from t for update; update public.t set a = 1 where true;'),
    ).toEqual([]);
  });
});
