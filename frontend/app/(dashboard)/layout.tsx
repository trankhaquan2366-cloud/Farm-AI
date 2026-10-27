import { AppShell } from '@/components/layout/app-shell'
import GlobalSearch from '@/components/GlobalSearch';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
