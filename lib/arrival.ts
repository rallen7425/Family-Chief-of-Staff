import type { EntryKind } from "@/lib/types";

/** One row of `family_chief_of_staff.arrival_buffer_rules`. */
export interface ArrivalBufferRule {
  id: string;
  /** null = the general "kid's activity" fallback. */
  category: string | null;
  appliesToKidsOnly: boolean;
  bufferMinutes: number;
}

interface InferArrivalOpts {
  kind: EntryKind;
  startsAt?: string | null;
  category?: string | null;
  subjectMemberId: string | null;
  subjectIsAdult: boolean;
}

/**
 * The buffer rule that applies to an entry, or null. Priority: an exact
 * category match wins; otherwise the general rule (category === null)
 * applies when the subject is a child. No default for adult-subject or
 * whole-household entries, or for non-event kinds.
 */
export function matchArrivalRule(
  opts: InferArrivalOpts,
  rules: ArrivalBufferRule[]
): ArrivalBufferRule | null {
  if (opts.kind !== "event") return null;
  if (!opts.subjectMemberId || opts.subjectIsAdult) return null;

  if (opts.category) {
    const exact = rules.find(
      (r) => r.category != null && r.category.toLowerCase() === opts.category!.toLowerCase()
    );
    if (exact) return exact;
  }
  return rules.find((r) => r.category == null) ?? null;
}

/**
 * Inferred arrival instant (ISO) for an entry with a start time and no
 * manually-set / stated arrival, or null when no rule applies.
 */
export function inferArrivalAt(opts: InferArrivalOpts, rules: ArrivalBufferRule[]): string | null {
  if (!opts.startsAt) return null;
  const rule = matchArrivalRule(opts, rules);
  if (!rule) return null;
  return new Date(new Date(opts.startsAt).getTime() - rule.bufferMinutes * 60_000).toISOString();
}

/** Human-readable provenance for an arrival badge, e.g.
 * "Auto · 60 min early (game default)" / "Auto · 15 min early (kids' activity default)". */
export function describeArrivalRule(rule: ArrivalBufferRule): string {
  const scope = rule.category ? `${rule.category} default` : "kids' activity default";
  return `Auto · ${rule.bufferMinutes} min early (${scope})`;
}
