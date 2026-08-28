"use client";

import { createContext, useContext } from "react";
import type { ArrivalBufferRule } from "@/lib/arrival";
import type { LinkableEntry } from "@/components/entries/EntryForm";

interface EntryEditingValue {
  arrivalRules: ArrivalBufferRule[];
  linkables: LinkableEntry[];
}

const EntryEditingContext = createContext<EntryEditingValue>({ arrivalRules: [], linkables: [] });

/** Supplies the arrival-buffer rules + linkable entries that any
 * EntryDetailsModal opened from the schedule/today views needs, without
 * threading them through every list component. */
export function EntryEditingProvider({
  arrivalRules,
  linkables = [],
  children,
}: {
  arrivalRules: ArrivalBufferRule[];
  linkables?: LinkableEntry[];
  children: React.ReactNode;
}) {
  return (
    <EntryEditingContext.Provider value={{ arrivalRules, linkables }}>{children}</EntryEditingContext.Provider>
  );
}

export function useEntryEditing() {
  return useContext(EntryEditingContext);
}
