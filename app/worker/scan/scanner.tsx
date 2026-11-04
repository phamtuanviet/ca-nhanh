'use client';

import { Camera, CameraOff, Keyboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PageHeader } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { tokenFromScan } from '@/lib/qr-token';

type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

/**
 * Quét QR bằng camera sau. Chrome Android có sẵn BarcodeDetector; Safari iOS chưa có nên nạp
 * @zxing/browser khi cần. Quét được mã thì chuyển sang /c/<token> để check-in/check-out.
 */
export function Scanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'denied' | 'unsupported'>(
    'starting',
  );
  const [notQr, setNotQr] = useState(false);
  const [manual, setManual] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopZxing: (() => void) | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const handle = (text: string) => {
      if (done.current) return;
      const token = tokenFromScan(text);
      if (!token) {
        setNotQr(true);
        return;
      }
      done.current = true;
      router.push(`/c/${token}`);
    };

    void (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        setStatus('denied');
        return;
      }
      if (cancelled || !videoRef.current) return;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStatus('scanning');

      if (window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        timer = setInterval(async () => {
          if (video.readyState < 2) return;
          const codes = await detector.detect(video).catch(() => []);
          if (codes[0]) handle(codes[0].rawValue);
        }, 250);
      } else {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (cancelled) return;
        const controls = await new BrowserQRCodeReader().decodeFromVideoElement(video, (result) => {
          if (result) handle(result.getText());
        });
        stopZxing = () => controls.stop();
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stopZxing?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [router]);

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = tokenFromScan(String(new FormData(event.currentTarget).get('code') ?? ''));
    if (token) router.push(`/c/${token}`);
    else setNotQr(true);
  }

  return (
    <>
      <PageHeader title="Quét QR" description="Hướng camera vào mã trên kiosk của quán" />
      <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-card)] bg-muc-990">
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
          aria-label="Khung camera"
        />
        {status === 'scanning' ? (
          <div
            className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-spark/90"
            aria-hidden
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
            {status === 'starting' ? (
              <p className="inline-flex items-center gap-2">
                <Camera className="size-5" aria-hidden /> Đang mở camera…
              </p>
            ) : (
              <div className="grid justify-items-center gap-2">
                <CameraOff className="size-8" aria-hidden />
                <p className="font-semibold">
                  {status === 'denied'
                    ? 'Chưa có quyền dùng camera'
                    : 'Trình duyệt không mở được camera'}
                </p>
                <p className="text-sm text-white/80">
                  Mở ứng dụng Camera của điện thoại và quét mã trên kiosk, hoặc nhập mã bên dưới.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {notQr ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          Đây không phải mã chấm công của Ca Nhanh. Hãy quét mã trên kiosk của quán.
        </p>
      ) : null}
      <div className="mt-4">
        {manual || status === 'denied' || status === 'unsupported' ? (
          <form onSubmit={submitManual} className="flex gap-2">
            <Input
              name="code"
              placeholder="Dán đường dẫn hoặc mã QR"
              aria-label="Mã QR"
              className="h-11"
            />
            <Button type="submit">Gửi</Button>
          </form>
        ) : (
          <Button variant="ghost" onClick={() => setManual(true)}>
            <Keyboard aria-hidden /> Nhập mã thay vì quét
          </Button>
        )}
      </div>
    </>
  );
}
