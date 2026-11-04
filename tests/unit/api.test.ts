import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, handle, ok } from '@/lib/api';

const request = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/v1/test', { method: 'POST', headers });

afterEach(() => vi.restoreAllMocks());

describe('handle()', () => {
  it('trả phong bì { data } và luôn có X-Request-Id', async () => {
    const res = await handle(request(), async () => ok({ hello: 'world' }, { status: 201 }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: { hello: 'world' } });
    expect(res.headers.get('x-request-id')).toMatch(/^req_[0-9a-f]{8}$/);
  });

  it('giữ nguyên X-Request-Id do client gửi', async () => {
    const res = await handle(request({ 'x-request-id': 'req_client1' }), async () => ok(null));
    expect(res.headers.get('x-request-id')).toBe('req_client1');
  });

  it('ApiError → mã HTTP và phong bì lỗi theo 05 §2.1', async () => {
    const res = await handle(request({ 'x-request-id': 'req_abc' }), async () => {
      throw new ApiError('SHIFT_FULL');
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: {
        code: 'SHIFT_FULL',
        message: 'Ca vừa đủ người',
        details: null,
        request_id: 'req_abc',
      },
    });
  });

  it('ZodError → 400 VALIDATION_ERROR kèm danh sách trường', async () => {
    const res = await handle(request(), async () => {
      z.object({ headcount: z.number().int().min(1) }).parse({ headcount: 0 });
      return ok(null);
    });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0].field).toBe('headcount');
  });

  it('JSON hỏng → 400', async () => {
    const res = await handle(request(), async () => {
      JSON.parse('{oops');
      return ok(null);
    });
    expect(res.status).toBe(400);
  });

  it('lỗi bất ngờ → 500, không lộ chi tiết, có ghi log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handle(request(), async () => {
      throw new Error('secret stack');
    });
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('secret stack');
    expect(log).toHaveBeenCalledOnce();
  });

  it('ghi đè mã HTTP và thông điệp (503 khi CSDL không phản hồi)', async () => {
    const res = await handle(request(), async () => {
      throw new ApiError('INTERNAL_ERROR', null, 'CSDL không phản hồi', 503);
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error.message).toBe('CSDL không phản hồi');
  });
});
