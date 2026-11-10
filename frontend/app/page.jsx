"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Building2, Eye, EyeOff, FlaskConical, GraduationCap, KeyRound, LogIn, Mail, Presentation, ShieldCheck, User, UserCog, UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { Button, DBS, ErrorNote, Field, Loader } from "@/components/ui";

// Demo accounts exist only when the backend was seeded (npm run db:seed). Hidden in production builds.
const SHOW_DEMO = process.env.NODE_ENV !== "production";
const DEMOS = [
  ["Admin", ShieldCheck, "admin@nova.edu", "Admin@12345"],
  ["Teacher", Presentation, "teacher@nova.edu", "Teacher@123"],
  ["Student", GraduationCap, "student@nova.edu", "Student@123"],
  ["Multi-org · Nova", Building2, "hamza@mail.com", "Hamza@Nova1"],
  ["Multi-org · Orion", Building2, "hamza@mail.com", "Hamza@Orion1"],
];
const EMPTY = { name: "", email: "", password: "", role: "student", orgId: "", adminCode: "" };
const HERO = [[ShieldCheck, "Admins"], [Presentation, "Teachers"], [GraduationCap, "Students"]];

export default function AuthPage() {
  const router = useRouter();
  const { db, setDb, api, user, ready, login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  // Filled only after the server verified the password and found it in several organizations.
  const [orgChoices, setOrgChoices] = useState(null);
  const orgs = useApi(() => api.orgs(), [api]);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);
  if (!ready || user) return <Loader />;

  const reset = (next = EMPTY) => { setF(next); setErr(""); setOrgChoices(null); };
  const set = (k) => (e) => {
    const credentialsChanged = k === "email" || k === "password";
    setF({ ...f, [k]: e.target.value, ...(credentialsChanged && { orgId: "" }) });
    setErr("");
    if (credentialsChanged) setOrgChoices(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (mode === "login") await login({ email: f.email, password: f.password, ...(orgChoices && f.orgId && { orgId: f.orgId }) });
      else await signup({ name: f.name, email: f.email, password: f.password, role: f.role, orgId: f.orgId, ...(f.role === "admin" && { adminCode: f.adminCode }) });
      router.push("/dashboard");
    } catch (x) {
      if (x.code === "ORG_REQUIRED") setOrgChoices(x.details?.orgs ?? []);
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2">
      {/* hero */}
      <section className="animate-rise space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300">
          <GraduationCap className="h-4 w-4 text-violet-300" aria-hidden /> OrgPortal <span className="text-slate-500">· multi-organization learning hub</span>
        </div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          One portal for every{" "}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">organization</span>.
        </h1>
        <p className="max-w-md text-slate-400">Admins, teachers and students — each with their own dashboard, running on the database you pick.</p>
        <div className="grid max-w-md grid-cols-3 gap-3 text-center text-sm">
          {HERO.map(([Icon, t], i) => (
            <div key={t} style={{ animationDelay: `${i * 120}ms` }} className="glass glass-hover animate-rise p-4">
              <Icon className="mx-auto h-6 w-6 text-violet-300" aria-hidden />
              <div className="mt-2 text-slate-300">{t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* card */}
      <section className="glass animate-rise space-y-5 p-6 shadow-2xl shadow-violet-500/10 sm:p-8">
        {/* DB switch */}
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Database</div>
          <div className="relative grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-900/70 p-1">
            <span
              className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 shadow-lg transition-all duration-300 ${
                db === "mysql" ? "left-1" : "left-[calc(50%+3px)]"
              }`}
            />
            {Object.entries(DBS).map(([k, { label, Icon }]) => (
              <button
                key={k}
                type="button"
                onClick={() => { reset(); setDb(k); }}
                className={`relative z-10 inline-flex items-center justify-center gap-2 py-2 text-sm font-semibold transition ${db === k ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* mode tabs */}
        <div className="grid grid-cols-2 gap-2 text-sm font-medium">
          {[["login", "Sign in", LogIn], ["register", "Create account", UserPlus]].map(([k, t, Icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => { setMode(k); setErr(""); setOrgChoices(null); }}
              className={`inline-flex items-center justify-center gap-2 rounded-xl py-2 transition ${mode === k ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              <Icon className="h-4 w-4" aria-hidden /> {t}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <Field label="Name" icon={User}>
              <input className="field" required autoComplete="name" value={f.name} onChange={set("name")} placeholder="Your full name" />
            </Field>
          )}
          <Field label="Email" icon={Mail}>
            <input className="field" type="email" required autoComplete="email" value={f.email} onChange={set("email")} placeholder="you@school.edu" />
          </Field>
          <Field label="Password" icon={KeyRound}>
            <div className="relative">
              <input
                className="field pr-12"
                type={show ? "text" : "password"}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "register" ? 8 : undefined}
                value={f.password}
                onChange={set("password")}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === "register" && <span className="text-xs text-slate-500">At least 8 characters, with letters and numbers.</span>}
          </Field>

          {mode === "login" && orgChoices?.length > 0 && (
            <Field label="Organization" icon={Building2}>
              <select className="field" required value={f.orgId} onChange={(e) => { setF({ ...f, orgId: e.target.value }); setErr(""); }}>
                <option value="">Select organization</option>
                {orgChoices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          )}

          {mode === "register" && (
            <>
              <Field label="Role" icon={UserCog}>
                <select className="field" value={f.role} onChange={set("role")}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Field label="Organization" icon={Building2}>
                <select className="field" required value={f.orgId} onChange={set("orgId")} disabled={orgs.loading}>
                  <option value="">{orgs.loading ? "Loading…" : "Select organization"}</option>
                  {orgs.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </Field>
              {orgs.error && <ErrorNote onRetry={orgs.reload}>{orgs.error.message}</ErrorNote>}
              {f.role === "admin" && (
                <Field label="Admin code" icon={ShieldCheck}>
                  <input className="field" type="password" required autoComplete="off" value={f.adminCode} onChange={set("adminCode")} placeholder="Provided by your administrator" />
                </Field>
              )}
            </>
          )}

          <ErrorNote>{err}</ErrorNote>

          <Button type="submit" className="w-full" loading={busy}>
            {mode === "login" ? "Sign in" : "Create account"} {!busy && <ArrowRight className="h-4 w-4" aria-hidden />}
          </Button>
        </form>

        {SHOW_DEMO && (
          <details className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-slate-300">
              <FlaskConical className="h-4 w-4" aria-hidden /> Demo accounts <span className="text-slate-500">(development only)</span>
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMOS.map(([t, Icon, email, password]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setMode("login"); reset({ ...EMPTY, email, password }); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-slate-300 transition hover:border-violet-400/50 hover:bg-white/10"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden /> {t}
                </button>
              ))}
            </div>
          </details>
        )}
      </section>
    </main>
  );
}
