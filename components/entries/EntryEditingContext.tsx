"use client";

import { createContext, useContext } from "react";
import type { ArrivalBufferRule } from "@/lib/arrival";
import type { LinkableEntry } from "@/components/entries/EntryForm";
import type { MemberDetail } from "@/lib/types";

interface EntryEditingValue {
  arrivalRules: ArrivalBufferRule[];
  linkables: LinkableEntry[];
  activitiesByMember: Record<string, MemberDetail[]>;
}

const EntryEditingContext = createContext<EntryEditingValue>({
  arrivalRules: [],
  linkables: [],
  activitiesByMember: {},
});

/** Supplies the arrival-buffer rules, linkable entries, and per-member
 * activities that any EntryDetailsModal opened from the schedule/today
 * views needs, without threading them through every list component. */
export function EntryEditingProvider({
  arrivalRules,
  linkables = [],
  activitiesByMember = {},
  children,
}: {
  arrivalRules: ArrivalBufferRule[];
  linkables?: LinkableEntry[];
  activitiesByMember?: Record<string, MemberDetail[]>;
  children: React.ReactNode;
}) {
  return (
    <EntryEditingContext.Provider value={{ arrivalRules, linkables, activitiesByMember }}>
      {children}
    </EntryEditingContext.Provider>
  );
}

export function useEntryEditing() {
  return useContext(EntryEditingContext);
}
