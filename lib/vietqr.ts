// VietQR Quick Link (05 §8): https://img.vietqr.io/image/<BIN>-<ACCOUNT>-<TEMPLATE>.png

export type BankAccount = { bin: string; account_no: string; account_name: string };

/** URL ảnh QR chuyển khoản. `accountName` chỉ để hiển thị trên ảnh, không thuộc chuẩn VietQR. */
export function vietQrImageUrl(bank: BankAccount, amount: number, transferNote: string): string {
  const query = new URLSearchParams({
    amount: String(amount),
    addInfo: transferNote,
    accountName: bank.account_name,
  });
  return `https://img.vietqr.io/image/${bank.bin}-${bank.account_no}-compact2.png?${query.toString()}`;
}
