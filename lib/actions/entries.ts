"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { buildEntryRows } from "@/lib/events/recurrence";
import { getFamilyMembers } from "@/lib/data/familyMembers";
import { getArrivalBufferRules } from "@/lib/data/arrivalRules";
import { inferArrivalAt } from "@/lib/arrival";
import type { EntryInput, SourceDetail, SourceType } from "@/lib/types";

function revalidateEntryViews() {
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/todo");
  revalidatePath("/review");
}

function validate(input: EntryInput): string | null {
  if (!input.title.trim()) return "Title is required.";
  if ((input.kind === "event" || input.kind === "advisory") && !input.startsAt) {
    return "Date is required.";
  }
  if (input.recurrence && input.recurrence.untilDate < input.recurrence.localDate) {
    return "The repeat end date must be on or after the entry date.";
  }
  return null;
}

/** Fills in an inferred arrival time when the caller (pipeline / chat)
 * didn't set one explicitly. The EntryForm sends an explicit
 * `arrivalSource`, so this only kicks in for non-UI paths. */
async function resolveArrival(input: EntryInput): Promise<EntryInput> {
  if (input.arrivalSource || input.arrivalAt || input.kind !== "event") return input;
  const [members, rules] = await Promise.all([getFamilyMembers(), getArrivalBufferRules()]);
  const subject = members.find((m) => m.id === input.subjectMemberId);
  const arrivalAt = inferArrivalAt(
    {
      kind: input.kind,
      startsAt: input.startsAt,
      category: input.category,
      subjectMemberId: input.subjectMemberId,
      subjectIsAdult: subject?.isAdult ?? false,
    },
    rules
  );
  return arrivalAt ? { ...input, arrivalAt, arrivalSource: "inferred" } : input;
}

async function syncOwners(entryIds: string[], ownerMemberIds: string[]): Promise<void> {
  if (entryIds.length === 0) return;
  const supabase = getSupabaseClient();
  await supabase.from("entry_owners").delete().in("entry_id", entryIds);
  const uniqueOwners = [...new Set(ownerMemberIds)];
  if (uniqueOwners.length === 0) return;
  const rows = entryIds.flatMap((entry_id) =>
    uniqueOwners.map((family_member_id) => ({ entry_id, family_member_id }))
  );
  const { error } = await supabase.from("entry_owners").insert(rows);
  if (error) throw error;
}

export async function createEntry(
  rawInput: EntryInput,
  opts: { sourceType?: SourceType; sourceDetail?: SourceDetail; status?: "confirmed" | "pending_review" } = {}
): Promise<{ error?: string }> {
  const err = validate(rawInput);
  if (err) return { error: err };

  const input = await resolveArrival(rawInput);
  const rows = buildEntryRows({
    input,
    sourceType: opts.sourceType ?? "manual",
    sourceDetail: opts.sourceDetail,
    status: opts.status,
  });

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("entries").insert(rows).select("id");
  if (error) return { error: error.message };

  try {
    await syncOwners(
      (data ?? []).map((r) => r.id),
      input.ownerMemberIds
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to set owners." };
  }

  revalidateEntryViews();
  return {};
}

export async function updateEntry(id: string, rawInput: EntryInput): Promise<{ error?: string }> {
  const err = validate(rawInput);
  if (err) return { error: err };
  const input = await resolveArrival(rawInput);

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("entries")
    .update({
      title: input.title.trim(),
      subject_member_id: input.subjectMemberId,
      scope: input.scope,
      busy_status: input.busyStatus,
      category: input.category?.trim() || null,
      notes: input.notes?.trim() || null,
      location_text: input.location?.trim() || null,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
      due_at: input.dueAt ?? null,
      is_all_day: input.allDay,
      arrival_at: input.arrivalAt ?? null,
      arrival_source: input.arrivalSource ?? null,
      linked_entry_id: input.linkedEntryId ?? null,
      // status is owned by the review flow, not field edits.
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  try {
    await syncOwners([id], input.ownerMemberIds);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to set owners." };
  }

  revalidateEntryViews();
  return {};
}

/** Hard-delete. Does NOT revalidate — the caller shows a confirmation
 * step and calls router.refresh() on dismiss (see EntryDetailsModal). */
export async function deleteEntry(id: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function toggleTaskComplete(id: string, completed: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("entries")
    .update({
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
  revalidateEntryViews();
}

export async function confirmEntry(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("entries")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidateEntryViews();
}

export async function dismissEntry(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("entries")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidateEntryViews();
}
