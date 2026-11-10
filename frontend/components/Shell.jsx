"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, GraduationCap, IdCard, LayoutDashboard, LogOut, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, DbBadge, Loader, RoleBadge } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", Icon: Users, roles: ["admin"] },
  { href: "/dashboard/reports", label: "Reports", Icon: BarChart3, roles: ["admin"] },
  { href: "/dashboard/profile", label: "Profile", Icon: IdCard },
];

// UI-level guard only. Every API route enforces authentication and roles on the server.
export default function Shell({ roles, children }) {
  const { user, ready, db, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [leaving, setLeaving] = useState(false);
  const allowed = user && (!roles || roles.includes(user.role));

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/");
    else if (!allowed) router.replace("/dashboard");
  }, [ready, user, allowed, router]);

  if (!allowed) return <Loader />;

  const signOut = async () => {
    setLeaving(true);
    await logout();
    router.replace("/");
  };

  return (
    <div className="mx-auto max-w-6xl px-5 pb-16">
      <header className="sticky top-0 z-40 -mx-5 mb-8 border-b border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
              <GraduationCap className="h-4 w-4 text-white" aria-hidden />
            </span>
            <span>Org<span className="text-violet-400">Portal</span></span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <DbBadge db={db} />
            <RoleBadge role={user.role} />
            <Button variant="danger" className="!px-3 !py-1.5" onClick={signOut} loading={leaving}>
              {!leaving && <LogOut className="h-4 w-4" aria-hidden />} Logout
            </Button>
          </div>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto text-sm">
          {NAV.filter((n) => !n.roles || n.roles.includes(user.role)).map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 transition ${path === href ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
