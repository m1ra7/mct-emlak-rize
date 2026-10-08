"use client";
import { useEffect, useState } from "react";
import type { neighborhoods } from "@/db/schema";
type Neighborhood = typeof neighborhoods.$inferSelect;
export function useNeighborhoods(district: string, initial: Neighborhood[]) {
  const [loaded, setLoaded] = useState<{
    district: string;
    rows: Neighborhood[];
  }>({ district: "", rows: [] });
  const [failure, setFailure] = useState<{ district: string; message: string }>(
    { district: "", message: "" },
  );
  useEffect(() => {
    if (!district) return;
    const controller = new AbortController();
    fetch(`/api/locations?district=${encodeURIComponent(district)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Mahalleler yüklenemedi. İlçeyi yeniden seçin.");
        return response.json();
      })
      .then((data) => {
        setLoaded({ district, rows: data.neighborhoods });
        setFailure({ district, message: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setFailure({
            district,
            message:
              error instanceof Error
                ? error.message
                : "Mahalleler yüklenemedi.",
          });
      });
    return () => controller.abort();
  }, [district]);
  return {
    rows:
      loaded.district === district
        ? loaded.rows
        : initial.filter((n) => n.districtId === district),
    error: failure.district === district ? failure.message : "",
  };
}
