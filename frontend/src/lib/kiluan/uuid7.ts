/** UUID time-ordered (emulasi UUIDv7) untuk id klien offline-first. */
export function uuid7(): string {
  const ms = Date.now()
  const seq = (performance.now() * 1000) % 0xffff
  const rand = crypto.getRandomValues(new Uint8Array(8))
  const hex = (n: number, len: number) => n.toString(16).padStart(len, '0')
  const r = Array.from(rand, (b) => hex(b, 2)).join('')
  return `${hex(ms, 12).slice(0, 8)}-${hex(ms, 12).slice(8, 12)}-7${hex(seq, 3).slice(1)}-${r.slice(0, 4)}-${r.slice(4, 16)}`
}
