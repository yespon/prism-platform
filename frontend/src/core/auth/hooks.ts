"use client";

import { useQuery } from "@tanstack/react-query";

import { getSession, type Session } from "@/core/auth/auth-api";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      return getSession();
    },
  });
}
