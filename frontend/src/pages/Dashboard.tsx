import { Activity, Link2, MousePointerClick, Plus, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router'

import { useMe, useOverview } from '@/api/queries'
import { TimeChart } from '@/components/charts/TimeChart'
import { DaysSelect } from '@/components/DaysSelect'
import { CreateLinkDialog } from '@/components/links/CreateLinkDialog'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, StatCard } from '@/components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { useTitle } from '@/hooks/useTitle'
import { PageHeader } from '@/layouts/AppLayout'
import { formatNumber } from '@/lib/format'
import { displayShortUrl, shortTarget } from '@/lib/links'

export default function Dashboard() {
  useTitle('Dashboard')
  const { data: user } = useMe()
  const [days, setDays] = useState(30)
  const [creating, setCreating] = useState(false)
  const { data, isPending, error, refetch } = useOverview(days)

  const newLink = (
    <Button onClick={() => setCreating(true)} icon={<Plus className="size-4" />}>
      New link
    </Button>
  )

  return (
    <>
      <PageHeader title={`Hi, ${user?.username ?? 'there'}`} description="Here's how your links are doing." actions={newLink} />
      <CreateLinkDialog open={creating} onClose={() => setCreating(false)} />

      {error ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : isPending ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
          <Skeleton className="h-80 rounded-xl sm:col-span-2 lg:col-span-4" />
        </div>
      ) : data.total_links === 0 ? (
        <Card>
          <EmptyState
            icon={<Link2 className="size-6" />}
            title="Create your first short link"
            text="Shorten a long URL, share it anywhere, and watch the clicks come in here."
            action={newLink}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total links" value={formatNumber(data.total_links)} icon={<Link2 className="size-4" />} />
            <StatCard label="Active links" value={formatNumber(data.active_links)} icon={<Activity className="size-4" />} />
            <StatCard label="All-time clicks" value={formatNumber(data.total_clicks)} icon={<MousePointerClick className="size-4" />} />
            <StatCard label="Clicks, last 7 days" value={formatNumber(data.clicks_last_7_days)} icon={<TrendingUp className="size-4" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Clicks" description={`Last ${days} days`} action={<DaysSelect value={days} onChange={setDays} />} />
              <div className="p-4">
                <TimeChart data={data.clicks_by_day} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Top links" action={<RouterLink to="/links" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">View all</RouterLink>} />
              <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.top_links.map((link, i) => (
                  <li key={link.short_code} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-4 text-sm text-slate-400 tabular-nums">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <RouterLink to={`/links/${link.short_code}`} className="block truncate text-sm font-medium hover:underline">
                        {displayShortUrl(link.short_code)}
                      </RouterLink>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{shortTarget(link.long_url)}</p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{formatNumber(link.visits)}</span>
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
