"use client";
import { Building2, Clock, Cookie, Database, Fingerprint, IdCard, Mail, ShieldCheck, User } from "lucide-react";
import Shell from "@/components/Shell";
import { DBS, RoleBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { dateTime } from "@/lib/format";

function Row({ label, icon: Icon, children }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/5 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2 text-sm text-slate-400"><Icon className="h-4 w-4" aria-hidden /> {label}</span>
      <span className="break-all text-sm font-medium sm:max-w-[65%] sm:text-right">{children}</span>
    </div>
  );
}

function Profile() {
  const { user, session, db } = useAuth();
  return (
    <div className="mx-auto max-w-2xl animate-rise space-y-6">
      <div className="glass flex items-center gap-4 p-6">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-2xl font-bold">
          {user.name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <div className="mt-1"><RoleBadge role={user.role} /></div>
        </div>
      </div>

      <div className="glass p-6">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><User className="h-4 w-4 text-violet-300" aria-hidden /> Account</h2>
        <Row label="Email" icon={Mail}>{user.email}</Row>
        <Row label="Organization" icon={Building2}>{user.orgName}</Row>
        <Row label="Reg number" icon={IdCard}>{user.reg}</Row>
        <Row label="Database" icon={Database}>{DBS[db].label}</Row>
      </div>

      <div className="glass p-6">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-violet-300" aria-hidden /> Session</h2>
        <Row label="Session ID" icon={Fingerprint}><span className="font-mono text-xs">{session.id}</span></Row>
        <Row label="Signed in" icon={Clock}>{dateTime(session.createdAt)}</Row>
        <Row label="Expires" icon={Clock}>{dateTime(session.expiresAt)}</Row>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-sm text-emerald-200/90">
          <Cookie className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Your session token is stored in an <strong>HttpOnly, SameSite=Strict</strong> cookie. Scripts on this page cannot read it,
            and signing out revokes it on the server immediately.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Shell>
      <Profile />
    </Shell>
  );
}
