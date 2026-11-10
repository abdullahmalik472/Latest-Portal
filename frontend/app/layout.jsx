import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata = { title: "OrgPortal", description: "Multi-organization school portal" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-96 w-96 animate-float rounded-full bg-violet-600/20 blur-3xl" />
          <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] animate-float rounded-full bg-cyan-500/15 blur-3xl [animation-delay:-4s]" />
          <div className="absolute left-1/2 top-1/3 h-72 w-72 animate-float rounded-full bg-indigo-500/10 blur-3xl [animation-delay:-2s]" />
        </div>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
