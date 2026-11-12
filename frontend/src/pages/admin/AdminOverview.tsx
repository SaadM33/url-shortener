import { Link2, MousePointerClick, Users } from 'lucide-react'
import { useState } from 'react'

import { useSiteStats } from '@/api/queries'
import { TimeChart } from '@/components/charts/TimeChart'
import { DaysSelect } from '@/components/DaysSelect'
import { Card, CardHeader, StatCard } from '@/components/ui/Card'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { useTitle } from '@/hooks/useTitle'
import { PageHeader } from '@/layouts/AppLayout'
import { formatNumber } from '@/lib/format'
import { displayShortUrl, shortTarget } from '@/lib/links'

const SERIES = [
  { key: 'users', label: 'New users', color: '#10b981' },
  { key: 'links', label: 'New links', color: '#f59e0b' },
]

export default function AdminOverview() {
  useTitle('Admin')
  const [days, setDays] = useState(30)
  const { data, isPending, error, refetch } = useSiteStats(days)

  return (
    <>
      <PageHeader title="Admin overview" description="Site-wide activity." actions={<DaysSelect value={days} onChange={setDays} />} />
      {error ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Users" value={formatNumber(data.total_users)} icon={<Users className="size-4" />} />
            <StatCard label="Links" value={formatNumber(data.total_links)} icon={<Link2 className="size-4" />} />
            <StatCard label="Recorded clicks" value={formatNumber(data.total_clicks)} icon={<MousePointerClick className="size-4" />} />
          </div>
          <Card>
            <CardHeader title="Clicks per day" description={`Last ${days} days`} />
            <div className="p-4"><TimeChart data={data.clicks_by_day} /></div>
          </Card>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Growth" description="New users and links per day" />
              <div className="p-4">
                <TimeChart
                  series={SERIES}
                  height={220}
                  data={data.new_users_by_day.map((d, i) => ({ date: d.date, users: d.count, links: data.new_links_by_day[i]?.count ?? 0 }))}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Top links" />
              <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.top_links.map((l) => (
                  <li key={l.short_code} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{displayShortUrl(l.short_code)}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{shortTarget(l.long_url)}</p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{formatNumber(l.visits)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
