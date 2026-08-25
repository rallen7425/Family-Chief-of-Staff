import { getSupabaseClient } from "@/lib/supabase";
import type { MemberEmailDomainRow } from "@/lib/data/dbTypes";

export interface MemberEmailDomain {
  familyMemberId: string;
  domain: string;
}

/** Sender-domain → family member fallback rules (e.g. a kid's school
 * mailer), used when an email doesn't name a family member explicitly.
 * See scripts/pipeline/write.ts's resolvePerson(). */
export async function getMemberEmailDomains(): Promise<MemberEmailDomain[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("member_email_domains")
    .select("*")
    .returns<MemberEmailDomainRow[]>();
  if (error) throw error;
  return data.map((row) => ({ familyMemberId: row.family_member_id, domain: row.domain }));
}
