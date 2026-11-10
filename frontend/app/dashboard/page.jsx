"use client";
import Shell from "@/components/Shell";
import { useAuth } from "@/lib/auth";
import { AdminView, StudentView, TeacherView } from "@/components/views";

const VIEWS = { admin: AdminView, teacher: TeacherView, student: StudentView };

function Role() {
  const { user } = useAuth();
  const View = VIEWS[user.role];
  return <View user={user} />;
}

export default function DashboardPage() {
  return (
    <Shell>
      <Role />
    </Shell>
  );
}
