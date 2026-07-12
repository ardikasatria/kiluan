import type { AreaPoligon, Lokasi } from '@/lib/api/types'

export function areaKeVertices(area: unknown): Lokasi[] {
  if (!area || typeof area !== 'object') return []
  const a = area as { type?: string; coordinates?: [number, number][][] }
  if (a.type !== 'Polygon' || !a.coordinates?.[0]?.length) return []
  const ring = a.coordinates[0]
  const verts = ring.slice(0, ring.length > 1 && ring[0]![0] === ring[ring.length - 1]![0] && ring[0]![1] === ring[ring.length - 1]![1] ? -1 : undefined)
  return verts.map(([lng, lat]) => ({ lat, lng }))
}

export function verticesKeArea(vertices: Lokasi[]): AreaPoligon | null {
  if (vertices.length < 3) return null
  const ring = vertices.map((v) => [v.lng, v.lat] as [number, number])
  ring.push([vertices[0]!.lng, vertices[0]!.lat])
  return { type: 'Polygon', coordinates: [ring] }
}
