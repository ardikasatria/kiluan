import { Suspense } from 'react'
import VerifikasiEmailClient from './VerifikasiEmailClient'

export default function VerifikasiEmailPage() {
  return (
    <Suspense fallback={<div className="container py-16 text-center text-sm">Memuat…</div>}>
      <VerifikasiEmailClient />
    </Suspense>
  )
}
