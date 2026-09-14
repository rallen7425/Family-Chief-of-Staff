"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentMember } from "@/lib/currentMember";
import { getEmailConnectionById } from "@/lib/data/emailConnections";
import { decryptToken, decodeHexBytea } from "@/lib/security/tokenCrypto";

/** Every connector action is scoped to the real signed-in member
 * (lib/currentMember.ts) — stops one member's UI from acting on a
 * sibling's (or another household's) connection. */
async function assertOwnership(connectionId: string) {
  const activeMember = await getCurrentMember();
  if (!activeMember) return { error: "Not signed in." } as const;
  const connection = await getEmailConnectionById(connectionId);
  if (!connection) return { error: "Connection not found." } as const;
  if (connection.family_member_id !== activeMember.id) {
    return { error: "You can only manage your own connections." } as const;
  }
  return { connection } as const;
}

function revalidateConnectorViews() {
  revalidatePath("/profile");
  revalidatePath("/settings/accounts");
}

export async function pauseConnection(id: string): Promise<{ error?: string }> {
  const check = await assertOwnership(id);
  if ("error" in check) return { error: check.error };

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("email_connections")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateConnectorViews();
  return {};
}

export async function resumeConnection(id: string): Promise<{ error?: string }> {
  const check = await assertOwnership(id);
  if ("error" in check) return { error: check.error };

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("email_connections")
    .update({ status: "active", last_error: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateConnectorViews();
  return {};
}

async function revokeGoogleToken(refreshToken: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch {
    // Best-effort — don't block deletion on Google's revoke endpoint being
    // reachable. The row is going away regardless; a failed revoke just
    // means the grant may linger on Google's side until the user removes it
    // themselves at https://myaccount.google.com/permissions.
  }
}

export async function deleteConnection(id: string): Promise<{ error?: string }> {
  const check = await assertOwnership(id);
  if ("error" in check) return { error: check.error };
  const { connection } = check;

  if (connection.provider === "google") {
    const refreshToken = decryptToken(decodeHexBytea(connection.refresh_token_enc));
    await revokeGoogleToken(refreshToken);
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("email_connections").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateConnectorViews();
  return {};
}
