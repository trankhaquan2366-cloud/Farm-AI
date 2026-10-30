import { AppShell } from '@/components/layout/app-shell'
import { SWRProvider } from '@/components/providers/swr-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SWRProvider>
      <AppShell>{children}</AppShell>
    </SWRProvider>
  )
}
