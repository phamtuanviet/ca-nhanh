// Định dạng hiển thị theo giờ Việt Nam (dùng được ở cả server và client)
export { vnd } from './money';

const TZ = 'Asia/Ho_Chi_Minh';

/** "17:00" */
export function fmtTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString('vi-VN', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Ngày theo giờ Việt Nam dạng YYYY-MM-DD */
export function vnDate(value: string | Date = new Date()): string {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: TZ });
}

/** "Hôm nay", "Ngày mai", "Thứ Bảy 07/11" */
export function fmtDay(value: string | Date, now: Date = new Date()): string {
  const day = vnDate(value);
  const today = vnDate(now);
  const tomorrow = vnDate(new Date(now.getTime() + 86_400_000));
  if (day === today) return 'Hôm nay';
  if (day === tomorrow) return 'Ngày mai';
  return fmtDate(value);
}

/** "04/11" (ICU định dạng vi-VN ngày/tháng thành "04-11", nên dựng tay) */
function dayMonth(date: Date): string {
  return date.toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit' });
}

/** "Thứ Tư 04/11" */
export function fmtDate(value: string | Date): string {
  const date = new Date(value);
  const weekday = date.toLocaleDateString('vi-VN', { timeZone: TZ, weekday: 'long' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${dayMonth(date)}`;
}

/** "17:00–22:00" */
export function fmtRange(start: string | Date, end: string | Date): string {
  return `${fmtTime(start)}–${fmtTime(end)}`;
}

/** 420 → "420 m", 1250 → "1,3 km" */
export function fmtDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return '';
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`;
}

/** "13:05 · 04/11" */
export function fmtDateTime(value: string | Date): string {
  const date = new Date(value);
  return `${fmtTime(date)} · ${dayMonth(date)}`;
}

/** "vừa xong", "5 phút trước", "2 giờ trước", "3 ngày trước" */
export function fmtAgo(value: string | Date, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

/** Tên gọi ngắn: "Nguyễn Văn Minh" → "Minh" */
export function givenName(fullName: string): string {
  return fullName.trim().split(/\s+/).at(-1) ?? fullName;
}
