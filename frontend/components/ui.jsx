"use client";
import { useEffect, useState } from "react";
import {
  AlertCircle, CheckCircle2, Database, GraduationCap, Inbox, Loader2, Presentation, RefreshCw, ShieldCheck, X, Zap,
} from "lucide-react";

export const ROLE = {
  admin: { Icon: ShieldCheck, label: "Admin", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  teacher: { Icon: Presentation, label: "Teacher", cls: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300" },
  student: { Icon: GraduationCap, label: "Student", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
};

export const DBS = {
  mysql: { label: "MySQL", Icon: Database },
  supabase: { label: "Supabase", Icon: Zap },
};

const TONES = {
  violet: "from-violet-500 to-indigo-500",
  cyan: "from-cyan-400 to-sky-500",
  emerald: "from-emerald-400 to-teal-500",
  amber: "from-amber-400 to-orange-500",
  rose: "from-rose-400 to-pink-500",
};
const VARIANTS = {
  primary: "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25 hover:brightness-110",
  ghost: "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
  danger: "border border-rose-400/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
};

export function Badge({ children, className = "" }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

export function RoleBadge({ role }) {
  const r = ROLE[role] ?? ROLE.student;
  return <Badge className={r.cls}><r.Icon className="h-3.5 w-3.5" aria-hidden /> {r.label}</Badge>;
}

export function DbBadge({ db }) {
  const d = DBS[db];
  return <Badge className="border-violet-400/30 bg-violet-500/10 text-violet-300"><d.Icon className="h-3.5 w-3.5" aria-hidden /> {d.label}</Badge>;
}

export function Button({ variant = "primary", className = "", loading = false, disabled, children, ...p }) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, icon: Icon, children }) {
  return (
    <label className="block animate-rise space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />} {label}
      </span>
      {children}
    </label>
  );
}

export function CountUp({ to }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let f;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 700, 1);
      setN(Math.round(to * p));
      if (p < 1) f = requestAnimationFrame(step);
    };
    f = requestAnimationFrame(step);
    return () => cancelAnimationFrame(f);
  }, [to]);
  return <>{n}</>;
}

export function StatCard({ icon: Icon, label, value, tone = "violet", delay = 0, onClick, hint }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={`glass glass-hover group animate-rise p-5 text-left ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${TONES[tone]} text-white shadow-lg transition group-hover:rotate-6 group-hover:scale-110`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 truncate text-2xl font-bold">{typeof value === "number" ? <CountUp to={value} /> : value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Tag>
  );
}

export function StatSkeleton({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="glass h-[148px] animate-pulse p-5">
      <div className="mb-4 h-11 w-11 rounded-xl bg-white/10" />
      <div className="h-3 w-24 rounded bg-white/10" />
      <div className="mt-3 h-6 w-16 rounded bg-white/10" />
    </div>
  ));
}

export function Modal({ title, icon: Icon, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`glass max-h-[85vh] w-full animate-rise overflow-y-auto bg-slate-900/90 p-6 shadow-2xl ${wide ? "max-w-xl" : "max-w-md"}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            {Icon && <Icon className="h-5 w-5 text-violet-300" aria-hidden />} {title}
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ msg, onDone }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div role="status" className="fixed bottom-6 right-6 z-50 flex animate-rise items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 shadow-xl backdrop-blur">
      <CheckCircle2 className="h-4 w-4" aria-hidden /> {msg}
    </div>
  );
}

export function ErrorNote({ children, onRetry }) {
  if (!children) return null;
  return (
    <div role="alert" className="flex animate-rise items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{children}</span>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1 text-rose-200 underline-offset-2 hover:underline">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry
        </button>
      )}
    </div>
  );
}

export function Empty({ icon: Icon = Inbox, children }) {
  return (
    <div className="glass flex flex-col items-center gap-2 p-8 text-center text-slate-500">
      <Icon className="h-6 w-6" aria-hidden />
      {children}
    </div>
  );
}

export function Spinner({ className = "" }) {
  return <Loader2 className={`h-6 w-6 animate-spin text-violet-400 ${className}`} aria-label="Loading" />;
}

export function Loader() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner className="h-10 w-10" />
    </div>
  );
}
