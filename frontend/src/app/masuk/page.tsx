import { Suspense } from 'react'
import MasukForm from './MasukForm'

export default function MasukPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-16 text-center text-sm text-neutral-500">Memuat…</div>
      }
    >
      <MasukForm />
    </Suspense>
  )
}
