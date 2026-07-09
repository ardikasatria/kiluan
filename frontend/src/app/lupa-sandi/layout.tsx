import AuthPageLayout from '@/components/layout/AuthPageLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthPageLayout>{children}</AuthPageLayout>
}
