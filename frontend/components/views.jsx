"use client";
import { useState } from "react";
import { BookOpen, Building2, GraduationCap, IdCard, Mail, Plus, Presentation, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { Badge, Button, Empty, ErrorNote, Modal, RoleBadge, Spinner, StatCard, StatSkeleton, Toast } from "./ui";
import AddModal from "./AddModal";

function Hello({ user, sub }) {
  return (
    <div className="mb-8 animate-rise">
      <h1 className="text-3xl font-bold tracking-tight">
        Welcome, <span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">{user.name}</span>
      </h1>
      <p className="mt-1 text-slate-400">{sub}</p>
    </div>
  );
}

function Stats({ query, children, count }) {
  if (query.error) return <ErrorNote onRetry={query.reload}>{query.error.message}</ErrorNote>;
  return <div className={`grid gap-4 sm:grid-cols-2 ${count === 5 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>{query.data ? children(query.data) : <StatSkeleton count={count} />}</div>;
}

function CourseList({ title, Icon, query }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Icon className="h-5 w-5 text-violet-300" aria-hidden /> {title}</h2>
      {query.loading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorNote onRetry={query.reload}>{query.error.message}</ErrorNote>
      ) : query.data.length === 0 ? (
        <Empty>No courses yet</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {query.data.map((c, i) => (
            <div key={c.id} style={{ animationDelay: `${i * 70}ms` }} className="glass glass-hover animate-rise p-4">
              <div className="flex items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 text-violet-300" aria-hidden /> {c.title}</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-400"><Presentation className="h-3.5 w-3.5" aria-hidden /> {c.teacherName}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><Building2 className="h-3.5 w-3.5" aria-hidden /> {c.orgName}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function StudentView({ user }) {
  const { api } = useAuth();
  const stats = useApi(() => api.stats(), [api]);
  const courses = useApi(() => api.courses(), [api]);
  return (
    <>
      <Hello user={user} sub="Here is what's happening in your organization." />
      <Stats query={stats} count={4}>
        {(s) => (
          <>
            <StatCard icon={Presentation} label="Total teachers" value={s.teachers} tone="cyan" />
            <StatCard icon={BookOpen} label="Total courses" value={s.courses} tone="violet" delay={80} />
            <StatCard icon={Building2} label="Organization" value={user.orgName} tone="emerald" delay={160} />
            <StatCard icon={IdCard} label="Reg number" value={user.reg} tone="amber" delay={240} />
          </>
        )}
      </Stats>
      <CourseList title="Courses in your organization" Icon={BookOpen} query={courses} />
    </>
  );
}

export function TeacherView({ user }) {
  const { api } = useAuth();
  const [add, setAdd] = useState(false);
  const [toast, setToast] = useState("");
  const stats = useApi(() => api.stats(), [api]);
  const courses = useApi(() => api.courses({ mine: true }), [api]);
  const done = (msg) => { setToast(msg); stats.reload(); courses.reload(); };
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Hello user={user} sub="Manage your classes and keep an eye on your organization." />
        <Button onClick={() => setAdd(true)}><Plus className="h-4 w-4" aria-hidden /> Add course</Button>
      </div>
      <Stats query={stats} count={5}>
        {(s) => (
          <>
            <StatCard icon={GraduationCap} label="Total students" value={s.students} tone="emerald" />
            <StatCard icon={BookOpen} label="Total courses" value={s.courses} tone="violet" delay={80} />
            <StatCard icon={Presentation} label="Total teachers" value={s.teachers} tone="cyan" delay={160} />
            <StatCard icon={Building2} label="Organization" value={user.orgName} tone="rose" delay={240} />
            <StatCard icon={IdCard} label="Reg number" value={user.reg} tone="amber" delay={320} />
          </>
        )}
      </Stats>
      <CourseList title="My courses" Icon={BookOpen} query={courses} />
      {add && <AddModal kind="course" fixed onClose={() => setAdd(false)} onDone={done} />}
      <Toast msg={toast} onDone={() => setToast("")} />
    </>
  );
}

const ADD_BUTTONS = [
  ["org", "Organization", Building2],
  ["user", "User", UserPlus],
  ["teacher", "Teacher", Presentation],
  ["course", "Course", BookOpen],
];

export function AdminView({ user }) {
  const { api } = useAuth();
  const [add, setAdd] = useState(null);
  const [orgOpen, setOrgOpen] = useState(null);
  const [toast, setToast] = useState("");
  const stats = useApi(() => api.stats(), [api]);
  const orgs = useApi(() => api.orgDetails(), [api]);
  const open = orgs.data?.find((o) => o.id === orgOpen);
  const done = (msg) => { setToast(msg); stats.reload(); orgs.reload(); };
  return (
    <>
      <Hello user={user} sub="Full control over every organization, user and course." />
      <Stats query={stats} count={4}>
        {(s) => (
          <>
            <StatCard icon={GraduationCap} label="Total students" value={s.students} tone="emerald" />
            <StatCard icon={Presentation} label="Total teachers" value={s.teachers} tone="cyan" delay={80} />
            <StatCard icon={BookOpen} label="Total courses" value={s.courses} tone="violet" delay={160} />
            <StatCard icon={Building2} label="Organizations" value={s.orgs} tone="rose" delay={240} />
          </>
        )}
      </Stats>

      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5 text-violet-300" aria-hidden /> Quick add</h2>
        <div className="flex flex-wrap gap-3">
          {ADD_BUTTONS.map(([k, t, Icon]) => (
            <Button key={k} variant="ghost" onClick={() => setAdd(k)}><Icon className="h-4 w-4" aria-hidden /> {t}</Button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold"><Building2 className="h-5 w-5 text-violet-300" aria-hidden /> Organizations</h2>
        <p className="mb-4 text-sm text-slate-500">Click a block to see its members.</p>
        {orgs.loading && !orgs.data ? (
          <Spinner />
        ) : orgs.error ? (
          <ErrorNote onRetry={orgs.reload}>{orgs.error.message}</ErrorNote>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.data.map((o, i) => (
              <button
                key={o.id}
                onClick={() => setOrgOpen(o.id)}
                style={{ animationDelay: `${i * 80}ms` }}
                className="glass glass-hover animate-rise p-5 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-violet-300" aria-hidden /> {o.name}</div>
                  <Badge className="shrink-0 border-violet-400/30 bg-violet-500/10 text-violet-300">{o.users.length} members</Badge>
                </div>
                <div className="mt-4 flex gap-4 text-sm text-slate-400">
                  <span className="inline-flex items-center gap-1" title="Students"><GraduationCap className="h-4 w-4" aria-hidden /> {o.students}</span>
                  <span className="inline-flex items-center gap-1" title="Teachers"><Presentation className="h-4 w-4" aria-hidden /> {o.teachers}</span>
                  <span className="inline-flex items-center gap-1" title="Courses"><BookOpen className="h-4 w-4" aria-hidden /> {o.courses}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {open && (
        <Modal title={open.name} icon={Building2} onClose={() => setOrgOpen(null)} wide>
          <ul className="space-y-2">
            {open.users.length === 0 && <li className="text-center text-slate-500">No members yet</li>}
            {open.users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{u.name}</div>
                  <div className="flex items-center gap-1.5 truncate text-sm text-slate-400"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden /> {u.email}</div>
                </div>
                <RoleBadge role={u.role} />
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {add && <AddModal kind={add} onClose={() => setAdd(null)} onDone={done} />}
      <Toast msg={toast} onDone={() => setToast("")} />
    </>
  );
}
