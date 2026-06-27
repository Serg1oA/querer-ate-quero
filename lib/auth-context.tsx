"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const Ctx = createContext<User | null | "loading">("loading");

export const useUser = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | "loading">("loading");
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}
