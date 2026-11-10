"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DB_KEYS, UNAUTHORIZED_EVENT, createClient } from "@/lib/api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const DB_STORAGE_KEY = "orgportal:db"; // only the UI preference; never anything secret

function readSavedDb() {
  try {
    const v = localStorage.getItem(DB_STORAGE_KEY);
    return DB_KEYS.includes(v) ? v : "mysql";
  } catch {
    return "mysql";
  }
}

export function AuthProvider({ children }) {
  const [db, setDbState] = useState("mysql");
  const [auth, setAuth] = useState(null); // { user, session } from the backend
  const [ready, setReady] = useState(false);
  const api = useMemo(() => createClient(db), [db]);

  // Ask the backend who we are; the HttpOnly cookie is sent automatically.
  const loadMe = useCallback(async (which) => {
    try {
      setAuth(await createClient(which).me());
    } catch {
      setAuth(null);
    }
  }, []);

  useEffect(() => {
    const saved = readSavedDb();
    setDbState(saved);
    loadMe(saved).finally(() => setReady(true));
  }, [loadMe]);

  useEffect(() => {
    const onUnauthorized = (e) => e.detail?.db === db && setAuth(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [db]);

  const setDb = useCallback(
    async (next) => {
      setDbState(next);
      try { localStorage.setItem(DB_STORAGE_KEY, next); } catch {}
      setAuth(null);
      await loadMe(next); // each backend has its own session cookie
    },
    [loadMe],
  );

  const login = useCallback(async (form) => setAuth(await api.login(form)), [api]);
  const signup = useCallback(async (form) => setAuth(await api.register(form)), [api]);
  const logout = useCallback(async () => {
    try { await api.logout(); } finally { setAuth(null); }
  }, [api]);

  const value = { db, setDb, api, user: auth?.user ?? null, session: auth?.session ?? null, ready, login, signup, logout };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
