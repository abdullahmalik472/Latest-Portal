"use client";
import { ArrowRightLeft, BarChart3, CalendarDays, CalendarRange, Clock, History, Sun, Timer, TrendingUp, UserPlus } from "lucide-react";
import Shell from "@/components/Shell";
import { Empty, ErrorNote, RoleBadge, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { ago, dateTime } from "@/lib/format";
import { useApi } from "@/lib/useApi";

const WINDOW_ICONS = { last_10m: Timer, last_1h: Clock, last_1d: Sun, last_7d: CalendarDays, last_30d: CalendarRange };
const SHORT = { last_10m: "10m", last_1h: "1h", last_1d: "1d", last_7d: "7d", last_30d: "30d" };

function SectionTitle({ icon: Icon, children, aside }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-violet-300" aria-hidden /> {children}</h2>
      {aside}
    </div>
  );
}

function MigrationCard() {
  const { api } = useAuth();
  const m = useApi(() => api.migrationStatus(), [api]);
  if (m.loading) return null;
  if (m.error) return <ErrorNote onRetry={m.reload}>{m.error.message}</ErrorNote>;
  const { enabled, schedule, counts, lastRun } = m.data;
  const pct = counts.total ? Math.round((counts.migrated / counts.total) * 100) : 0;
  return (
    <div className="glass p-6">
      <SectionTitle icon={ArrowRightLeft} aside={<span className={`text-xs ${enabled ? "text-emerald-300" : "text-slate-500"}`}>{enabled ? `cron: ${schedule}` : "cron disabled"}</span>}>
        User migration · MySQL → Supabase
      </SectionTitle>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
        <span><strong className="text-slate-200">{counts.migrated}</strong> / {counts.total} migrated</span>
        <span><strong className="text-slate-200">{counts.pending}</strong> pending</span>
        {counts.stuck > 0 && <span className="text-rose-300"><strong>{counts.stuck}</strong> failed (max retries)</span>}
        {lastRun && <span>last run {ago(lastRun.startedAt)}{lastRun.error ? ` · error: ${lastRun.error}` : ""}</span>}
      </div>
    </div>
  );
}

function Reports() {
  const { api, db } = useAuth();
  const r = useApi(() => api.registrations(), [api]);

  if (r.loading) return <Spinner />;
  if (r.error) return <ErrorNote onRetry={r.reload}>{r.error.message}</ErrorNote>;
  const { windows, recent, snapshots, totalUsers } = r.data;
  const max = Math.max(...windows.map((w) => w.count), 1);

  return (
    <div className="animate-rise space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><BarChart3 className="h-6 w-6 text-violet-300" aria-hidden /> Registration reports</h1>
        <p className="text-slate-400">New accounts created within each time window · {totalUsers} users in total.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {windows.map((w, i) => {
          const Icon = WINDOW_ICONS[w.key] ?? Clock;
          return (
            <div key={w.key} style={{ animationDelay: `${i * 80}ms` }} className="glass glass-hover animate-rise p-4 text-center">
              <Icon className="mx-auto h-6 w-6 text-violet-300" aria-hidden />
              <div className="mt-2 text-3xl font-bold">{w.count}</div>
              <div className="text-xs uppercase tracking-wide text-slate-400">last {w.label}</div>
            </div>
          );
        })}
      </div>

      <div className="glass space-y-4 p-6">
        <SectionTitle icon={TrendingUp}>Comparison</SectionTitle>
        {windows.map((w) => (
          <div key={w.key} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 text-slate-400">{w.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${w.count ? Math.max((w.count / max) * 100, 4) : 0}%` }}
              />
            </div>
            <span className="w-8 text-right font-semibold">{w.count}</span>
          </div>
        ))}
      </div>

      {db === "mysql" && <MigrationCard />}

      <div className="glass p-6">
        <SectionTitle icon={UserPlus}>Latest registrations</SectionTitle>
        <ul className="space-y-2">
          {recent.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-2.5 text-sm">
              <span className="truncate">{u.name} <span className="text-slate-500">· {u.orgName}</span></span>
              <span className="flex shrink-0 items-center gap-3"><RoleBadge role={u.role} /><span className="text-slate-400">{ago(u.createdAt)}</span></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass p-6">
        <SectionTitle icon={History} aside={<span className="text-xs text-slate-500">written by the report cron job</span>}>Scheduled snapshots</SectionTitle>
        {snapshots.length === 0 ? (
          <Empty icon={History}>No snapshots yet. Start the worker (<code className="text-slate-300">npm run worker</code>) or run <code className="text-slate-300">npm run job:report</code>.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Generated</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  {Object.values(SHORT).map((s) => <th key={s} className="px-3 py-2 text-right font-medium">{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s) => (
                  <tr key={s.generatedAt} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 text-slate-300">{dateTime(s.generatedAt)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{s.total_users}</td>
                    {Object.keys(SHORT).map((k) => <td key={k} className="px-3 py-2 text-right text-slate-300">{s[k]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Shell roles={["admin"]}>
      <Reports />
    </Shell>
  );
}
