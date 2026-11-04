import { z } from 'zod';
import { handle, ok, readJson, requireUser } from '@/lib/api';
import { recordAttendance } from '@/lib/services/attendance';
import { attendanceSchema, uuid } from '@/lib/validators';

/** POST /api/v1/bookings/{id}/check-in: quét QR của quán kèm vị trí GPS (05 §4.5) */
export async function POST(
  req: Request,
  ctx: RouteContext<'/api/v1/bookings/[bookingId]/check-in'>,
) {
  return handle(req, async () => {
    const user = await requireUser(req, { role: 'worker' });
    const { bookingId } = z.object({ bookingId: uuid }).parse(await ctx.params);
    return ok(
      await recordAttendance(user, bookingId, 'check_in', await readJson(req, attendanceSchema)),
    );
  });
}
