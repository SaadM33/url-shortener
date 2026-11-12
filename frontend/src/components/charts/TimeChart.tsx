import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { formatDay } from '@/lib/format'

export type Series = { key: string; label: string; color: string }
type Row = { date: string } & Record<string, number | string>

const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const SINGLE: Series[] = [{ key: 'count', label: 'Clicks', color: '#6366f1' }]

/** Daily counts as a smooth area chart. One series by default, or pass several. */
export function TimeChart({ data, series = SINGLE, height = 260 }: { data: Row[]; series?: Series[]; height?: number }) {
  const total = data.reduce((sum, row) => sum + series.reduce((s, x) => s + Number(row[x.key] ?? 0), 0), 0)
  return (
    <figure className="w-full" style={{ height }}>
      <figcaption className="sr-only">
        {series.map((s) => s.label).join(', ')} per day, {total} in total over {data.length} days
      </figcaption>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tick={{ fill: 'currentColor', fontSize: 12 }}
            className="text-slate-500"
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={48} tick={{ fill: 'currentColor', fontSize: 12 }} className="text-slate-500" />
          <Tooltip
            labelFormatter={(d) => formatDay(String(d))}
            contentStyle={{ borderRadius: 8, border: '1px solid rgb(148 163 184 / 0.3)', background: 'var(--tooltip-bg, white)', fontSize: 13 }}
            wrapperClassName="[--tooltip-bg:white] dark:[--tooltip-bg:#0f172a]"
          />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={`url(#fill-${s.key})`} isAnimationActive={!reducedMotion} animationDuration={500} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  )
}
