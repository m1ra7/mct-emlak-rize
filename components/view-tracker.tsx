"use client";
import { useEffect } from "react";
export function ViewTracker({ id }: { id: string }) {
  useEffect(() => {
    void fetch(`/api/views/${id}`, { method: "POST" }).catch(() => {});
  }, [id]);
  return null;
}
