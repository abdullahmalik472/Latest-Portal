"use client";
import { useMemo, useState } from "react";
import { GraduationCap, Presentation, Search, ShieldCheck, Users as UsersIcon } from "lucide-react";
import Shell from "@/components/Shell";
import { ErrorNote, RoleBadge, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { ago } from "@/lib/format";
import { useApi } from "@/lib/useApi";

const FILTERS = [["all", "All", UsersIcon], ["admin", "Admins", ShieldCheck], ["teacher", "Teachers", Presentation], ["student", "Students", GraduationCap]];

function Users() {
  const { api } = useAuth();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const all = useApi(() => api.users(), [api]);
  const users = useMemo(
    () => (all.data ?? []).filter((u) => (role === "all" || u.role === role) && `${u.name} ${u.email} ${u.orgName}`.toLowerCase().includes(q.toLowerCase())),
    [all.data, role, q],
  );

  return (
    <div className="animate-rise">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><UsersIcon className="h-6 w-6 text-violet-300" aria-hidden /> All users</h1>
      <p className="mb-6 text-slate-400">{all.data ? `${users.length} shown` : " "}</p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
          <input className="field pl-9" placeholder="Search name, email, organization" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(([k, t, Icon]) => (
            <button
              key={k}
              onClick={() => setRole(k)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${role === k ? "bg-violet-500/80 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
            >
              <Icon className="h-4 w-4" aria-hidden /> {t}
            </button>
          ))}
        </div>
      </div>

      {all.error ? (
        <ErrorNote onRetry={all.reload}>{all.error.message}</ErrorNote>
      ) : all.loading ? (
        <Spinner />
      ) : (
        <div className="glass overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
              <tr>{["Name", "Email", "Role", "Organization", "Reg no.", "Joined"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 transition last:border-0 hover:bg-white/5">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-slate-300">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-slate-300">{u.orgName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{u.reg}</td>
                  <td className="px-4 py-3 text-slate-400">{ago(u.createdAt)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No users match</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Shell roles={["admin"]}>
      <Users />
    </Shell>
  );
}
