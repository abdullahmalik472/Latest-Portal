"use client";
import { useState } from "react";
import { BookOpen, Building2, KeyRound, Mail, Presentation, User, UserCog, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { Button, ErrorNote, Field, Modal } from "./ui";

const META = {
  org: { title: "Add organization", Icon: Building2, done: "Organization added" },
  user: { title: "Add user", Icon: UserPlus, done: "User added" },
  teacher: { title: "Add teacher", Icon: Presentation, done: "Teacher added" },
  course: { title: "Add course", Icon: BookOpen, done: "Course added" },
};

// kind: org | user | teacher | course. `fixed` = teacher's own "Add course" (server pins org + teacher anyway).
export default function AddModal({ kind, fixed = false, onClose, onDone }) {
  const { api } = useAuth();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "student", orgId: "", title: "", teacherId: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr(""); };

  const needsOrg = !fixed && kind !== "org";
  const orgs = useApi(() => (needsOrg ? api.orgs() : Promise.resolve([])), [api, needsOrg]);
  const orgId = f.orgId || orgs.data?.[0]?.id || "";
  const needsTeachers = kind === "course" && !fixed && Boolean(orgId);
  const teachers = useApi(() => (needsTeachers ? api.users({ role: "teacher", orgId }) : Promise.resolve([])), [api, needsTeachers, orgId]);
  const teacherId = teachers.data?.some((t) => t.id === f.teacherId) ? f.teacherId : teachers.data?.[0]?.id ?? "";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (kind === "org") await api.addOrg({ name: f.name });
      else if (kind === "course") await api.addCourse(fixed ? { title: f.title } : { title: f.title, orgId, teacherId });
      else await api.addUser({ name: f.name, email: f.email, password: f.password, role: kind === "teacher" ? "teacher" : f.role, orgId });
      onDone(META[kind].done);
      onClose();
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const orgSelect = needsOrg && (
    <Field label="Organization" icon={Building2}>
      <select className="field" value={orgId} onChange={set("orgId")} disabled={orgs.loading}>
        {orgs.loading && <option>Loading…</option>}
        {orgs.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </Field>
  );

  return (
    <Modal title={META[kind].title} icon={META[kind].Icon} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {kind === "org" && (
          <Field label="Organization name" icon={Building2}>
            <input className="field" required minLength={2} maxLength={120} value={f.name} onChange={set("name")} placeholder="e.g. Apex College" autoFocus />
          </Field>
        )}

        {(kind === "user" || kind === "teacher") && (
          <>
            <Field label="Name" icon={User}><input className="field" required maxLength={120} value={f.name} onChange={set("name")} autoFocus /></Field>
            <Field label="Email" icon={Mail}><input className="field" type="email" required value={f.email} onChange={set("email")} /></Field>
            <Field label="Password" icon={KeyRound}>
              <input className="field" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set("password")} placeholder="Min 8 characters, letters + numbers" />
            </Field>
            {kind === "user" && (
              <Field label="Role" icon={UserCog}>
                <select className="field" value={f.role} onChange={set("role")}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
            )}
            {orgSelect}
          </>
        )}

        {kind === "course" && (
          <>
            <Field label="Course title" icon={BookOpen}><input className="field" required minLength={2} maxLength={160} value={f.title} onChange={set("title")} autoFocus /></Field>
            {orgSelect}
            {!fixed && (
              <Field label="Teacher" icon={Presentation}>
                <select className="field" value={teacherId} onChange={set("teacherId")} disabled={teachers.loading}>
                  {teachers.loading && <option>Loading…</option>}
                  {!teachers.loading && !teachers.data?.length && <option value="">No teachers in this organization</option>}
                  {teachers.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            )}
          </>
        )}

        <ErrorNote>{err || orgs.error?.message || teachers.error?.message}</ErrorNote>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}
