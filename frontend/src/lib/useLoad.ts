"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, errorMessage } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

/** Loads data on mount and whenever `deps` change. A 401 sends the user back to login. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const { expire } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loadRef
      .current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiRequestError && e.status === 401) return expire();
        setError(errorMessage(e));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, setData, error, loading, reload };
}
