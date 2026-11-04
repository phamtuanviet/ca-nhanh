'use client';

import { useEffect, useRef } from 'react';
import { confetti, gain, odometer } from '@/design/motion/ca-nhanh-motion.js';

const CONFETTI_KEY = 'cn:confetti';

/**
 * Số dư lăn từng chữ số khi đổi; tiền vào thì "+số tiền" bay lên và pháo giấy cho lần đầu trong phiên
 * (design/COMPONENTS.md › WalletOdometer). Hàm odometer tự dựng các cột số và đặt aria-label.
 * Giảm chuyển động: số đổi ngay, không pháo giấy (xử lý trong design/motion).
 */
export function WalletOdometer({ balance }: { balance: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const el = numRef.current;
    if (!host || !el) return;
    odometer(el, balance);
    if (previous.current !== null && balance > previous.current) {
      gain(host, el, balance - previous.current);
      try {
        if (!sessionStorage.getItem(CONFETTI_KEY)) {
          sessionStorage.setItem(CONFETTI_KEY, '1');
          confetti(host);
        }
      } catch {
        // không có sessionStorage (chế độ riêng tư): bỏ pháo giấy
      }
    }
    previous.current = balance;
  }, [balance]);

  return (
    <div ref={hostRef} className="relative min-h-14" aria-live="polite">
      <span ref={numRef} className="cn-odo" data-testid="wallet-balance" role="img" />
    </div>
  );
}
