"use client";

import { useEffect } from "react";
import { markInboxSeen } from "@/lib/actions";

export function MarkInboxSeen() {
  useEffect(() => {
    void markInboxSeen();
  }, []);
  return null;
}
