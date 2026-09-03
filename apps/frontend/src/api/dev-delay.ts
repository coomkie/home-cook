/**
 * Dev-only: giả lập latency để xem skeleton / spinner.
 *
 * Cách dùng:
 * 1. Global — trong `.env`: `VITE_API_DELAY_MS=1500` rồi restart Vite
 * 2. Theo endpoint — sửa map bên dưới (ms). Key = prefix path (không gồm `/api`).
 *    Match dài nhất thắng. `*` = mặc định.
 *
 * Đặt `0` (hoặc xóa key) để tắt delay đó.
 */
export const DEV_API_DELAY_MS: Record<string, number> = {
  '*': Number(import.meta.env.VITE_API_DELAY_MS) || 0,

  // Bật từng dòng khi muốn test UI riêng:
  // '/recipes': 1500,
  // '/users/me': 2000,
  // '/auth/login': 1200,
  // '/auth/register': 1200,
  // '/users': 1500,
}

export function resolveDevDelayMs(path: string): number {
  if (!import.meta.env.DEV) return 0

  const pathname = path.split('?')[0] ?? path
  let best = DEV_API_DELAY_MS['*'] ?? 0
  let bestLen = 0

  for (const [prefix, ms] of Object.entries(DEV_API_DELAY_MS)) {
    if (prefix === '*' || ms <= 0) continue
    const hit =
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    if (hit && prefix.length >= bestLen) {
      best = ms
      bestLen = prefix.length
    }
  }

  return best > 0 ? best : 0
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
