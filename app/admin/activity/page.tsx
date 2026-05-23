import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function AdminActivity() {
  await requireAdmin();
  const admin = createAdminClient();

  // Pull the last 30 days of events. Cap at 5k rows for safety; on a beta
  // with thousands of events per day we'd need cursor pagination, but a
  // few hundred per day fits comfortably.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data: events } = await admin
    .from('analytics_events')
    .select('event_name, user_id, anon_id, created_at, path')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(5000);

  // Total event counts + top events table (last 30 days).
  const counts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};
  const uniqueUsersByDay: Record<string, Set<string>> = {};
  const todayKey = new Date().toISOString().slice(0, 10);
  let today = 0;
  for (const e of events || []) {
    counts[e.event_name] = (counts[e.event_name] || 0) + 1;
    const day = e.created_at.slice(0, 10);
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    if (day === todayKey) today++;
    const visitorKey = e.user_id || e.anon_id;
    if (visitorKey) {
      const set = uniqueUsersByDay[day] || (uniqueUsersByDay[day] = new Set());
      set.add(visitorKey);
    }
  }

  const topEvents = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  const totalEvents = (events || []).length;
  const uniqueVisitorsAllPeriod = new Set<string>();
  for (const set of Object.values(uniqueUsersByDay)) {
    for (const id of set) uniqueVisitorsAllPeriod.add(id);
  }

  // Build a 30-day series for the chart, oldest → newest.
  const days: { day: string; count: number; visitors: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const day = d.toISOString().slice(0, 10);
    days.push({
      day,
      count: dailyCounts[day] || 0,
      visitors: (uniqueUsersByDay[day]?.size) || 0,
    });
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Activity</h1>
      <p className="text-sm text-[--text-dim] mb-8">
        Last 30 days of analytics events. Server-side taps (signup, map
        creation) plus client-tracked events (view switch, template applied,
        AI expand, etc.). Dev environments don&apos;t emit — these are real users.
      </p>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Kpi label="Events today" value={today} sub="all event types" accent="pink" />
        <Kpi label="Events · 30d" value={totalEvents} sub={`max ${(events || []).length === 5000 ? '(5k cap hit)' : 'window'}`} accent="violet" />
        <Kpi
          label="Unique visitors · 30d"
          value={uniqueVisitorsAllPeriod.size}
          sub="user_id or anon_id"
          accent="cyan"
        />
        <Kpi
          label="Event types"
          value={Object.keys(counts).length}
          sub="distinct names seen"
          accent="amber"
        />
      </section>

      {/* Daily bar chart */}
      <section className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Daily events</h2>
          <span className="text-xs text-[--text-dim]">last 30 days · peak {maxCount}</span>
        </div>
        <div
          className="flex items-end gap-1 h-32"
          aria-label="Daily event counts for the last 30 days"
        >
          {days.map((d) => {
            const pct = (d.count / maxCount) * 100;
            const isToday = d.day === todayKey;
            return (
              <div
                key={d.day}
                className="flex-1 flex flex-col items-stretch justify-end h-full group"
                title={`${d.day} — ${d.count} events, ${d.visitors} unique`}
              >
                <div
                  className="rounded-t-sm"
                  style={{
                    height: `${Math.max(pct, 2)}%`,
                    background: isToday
                      ? 'linear-gradient(180deg, #ec4899, #8b5cf6)'
                      : 'linear-gradient(180deg, rgba(139,92,246,0.55), rgba(139,92,246,0.15))',
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-[--text-dim] mt-2">
          <span>{days[0].day}</span>
          <span>{days[days.length - 1].day}</span>
        </div>
      </section>

      {/* Top events table */}
      <section className="grid md:grid-cols-2 gap-5">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Top events · 30d</h2>
          {topEvents.length === 0 ? (
            <p className="text-sm text-[--text-dim] italic">
              No events recorded yet. They&apos;ll appear here once visitors
              hit the production build (dev tracking is disabled).
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[--text-dim] border-b border-white/10">
                  <th className="text-left py-2">Event</th>
                  <th className="text-right py-2">Count</th>
                  <th className="text-right py-2 w-1/3">Share</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.map(([name, count]) => {
                  const pct = (count / totalEvents) * 100;
                  return (
                    <tr key={name} className="border-b border-white/5">
                      <td className="py-2 font-mono text-[12px]">{name}</td>
                      <td className="py-2 text-right tabular-nums">{count}</td>
                      <td className="py-2 pl-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-pink-500/60 to-violet-500/40"
                            style={{ width: `${pct}%` }}
                          />
                          <span className="text-[10px] text-[--text-dim] tabular-nums w-9 text-right">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="font-semibold mb-3">Last 50 events</h2>
          <ul className="divide-y divide-white/5 -mx-5 max-h-96 overflow-y-auto">
            {(events || []).slice(0, 50).map((e, i) => (
              <li
                key={`${e.created_at}-${i}`}
                className="px-5 py-2 flex items-center justify-between gap-2 text-[12px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono truncate">{e.event_name}</div>
                  <div className="text-[10px] text-[--text-dim] truncate">
                    {e.path || '—'} · {e.user_id ? 'auth' : e.anon_id ? 'anon' : 'guest'}
                  </div>
                </div>
                <div className="text-[10px] text-[--text-dim] shrink-0 tabular-nums">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </li>
            ))}
            {(events || []).length === 0 && (
              <li className="px-5 py-6 text-sm text-[--text-dim] italic">
                Empty stream.
              </li>
            )}
          </ul>
        </div>
      </section>

      <p className="text-[11px] text-[--text-dim] mt-6">
        Add the <Link href="/admin" className="underline">Activity</Link> link
        to your sidebar via <code className="font-mono">app/admin/layout.tsx</code>.
        Tap more events from anywhere with{' '}
        <code className="font-mono">track(&apos;event_name&apos;, &#123; … &#125;)</code> on
        the client or{' '}
        <code className="font-mono">trackServerEvent(&#123; … &#125;)</code> on the
        server.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub: string;
  accent: 'pink' | 'violet' | 'cyan' | 'amber';
}) {
  const tones = {
    pink: 'from-pink-500/15 to-pink-500/0 border-pink-500/25',
    violet: 'from-violet-500/15 to-violet-500/0 border-violet-500/25',
    cyan: 'from-cyan-500/15 to-cyan-500/0 border-cyan-500/25',
    amber: 'from-amber-500/15 to-amber-500/0 border-amber-500/25',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${tones[accent]}`}>
      <div className="text-[10px] uppercase tracking-wider text-[--text-dim]">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
      <div className="text-[11px] text-[--text-dim] mt-0.5">{sub}</div>
    </div>
  );
}
