'use client';

import { useState } from 'react';
import { SeatSlots, type Seat } from './seat-slots';

/**
 * SeatSlots cho trang được làm mới bằng Realtime: chỗ nào được lấp sau khi mở trang
 * thì avatar mới nhất chạy hiệu ứng nảy vào chỗ (cn-seat--pop).
 */
export function SeatSlotsLive({
  headcount,
  seats,
  max,
}: {
  headcount: number;
  seats: Seat[];
  max?: number;
}) {
  const [initial] = useState(seats.length);
  return (
    <SeatSlots headcount={headcount} seats={seats} animateLast={seats.length > initial} max={max} />
  );
}
