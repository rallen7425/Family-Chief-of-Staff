import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { format } from "date-fns";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { FamilyMember } from "@/lib/types";

const client = new Anthropic();

const ExtractedItemSchema = z.object({
  kind: z
    .enum(["event", "task", "reminder", "advisory"])
    .describe(
      "event = something on the calendar (a game, appointment). task = an action item with a deadline (return a form). reminder = a small note tied to a date or an event (bring a water bottle). advisory = a non-personal heads-up affecting the household (a road closure, allow-extra-travel-time notice)."
    ),
  title: z.string(),
  person_hint: z.string().nullable().describe("Exact family member name if mentioned, else null"),
  date: z
    .string()
    .nullable()
    .describe("ISO date YYYY-MM-DD this item occurs/is due on. Resolve relative dates using the email's own date context. Null if no date is determinable."),
  time: z
    .string()
    .nullable()
    .describe("24-hour HH:mm start time — events/advisories only, only if a specific time is mentioned"),
  end_time: z
    .string()
    .nullable()
    .describe("24-hour HH:mm end time — only when the text states an end time or a duration from a stated start (e.g. 'practice 4:00-6:30pm'). Put this in the structured field, not in notes."),
  arrival_time: z
    .string()
    .nullable()
    .describe("24-hour HH:mm — an explicit 'players report by', 'arrive by', 'doors open', 'call time' etc. stated in the text. Null if none is stated (a default is applied elsewhere, not here)."),
  category: z
    .enum(["game", "practice", "rehearsal", "appointment", "other"])
    .nullable()
    .describe("Classify events/reminders into this fixed vocabulary. Null for tasks/advisories or when genuinely unclear."),
  location: z.string().nullable().describe("A place name or address, when stated. Put it here, not in notes."),
  is_critical: z
    .boolean()
    .describe(
      "true ONLY when missing this would derail the whole family's day or a whole-school / whole-household plan: a full school or office CLOSURE, a campus-wide EARLY DISMISSAL, a weather or safety EMERGENCY affecting everyone, the cancellation of a MAJOR event the whole family was planning around, or a hard deadline that is genuinely DUE TODAY with real consequences. " +
        "false for everything else. Specifically NOT critical: one child's or one team's practice/game being cancelled, moved, or rescheduled; a detail or sub-line of another item (report/arrival/pickup times, what to wear, where to park); a general health or informational notice (\"a case of X was reported\", \"monitor your child\", \"please be aware\"); any reminder; any ordinary future deadline. When unsure, false."
    ),
  notes: z.string().nullable().describe("Anything relevant that doesn't fit a structured field above."),
  source_excerpt: z.string().describe("The exact quoted snippet that justifies this item"),
  source: z.enum(["body", "attachment"]),
  attachment_name: z.string().nullable(),
  attachment_page: z.number().nullable().describe("1-indexed page number, PDF attachments only"),
});

const ExtractionResultSchema = z.object({
  items: z.array(ExtractedItemSchema),
});

export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;

export interface MessageAttachmentContent {
  name: string;
  /** Per-page text for PDFs (used for page-number provenance); null for
   * docx, which mammoth returns as a single unpaginated blob. */
  pages: string[] | null;
  text: string;
}

export interface MessageContent {
  subject: string;
  sender: string;
  bodyText: string;
  attachments: MessageAttachmentContent[];
  /** ISO datetime the email was received — the only anchor available for
   * resolving year-ambiguous or relative dates in the email's own text
   * (e.g. "through August 5" with no year, or "next Tuesday"). Without
   * this, the model has no grounding and can invent an arbitrary year. */
  receivedAt: string | null;
}

function buildPrompt(message: MessageContent): string {
  const receivedLabel = message.receivedAt
    ? format(new Date(message.receivedAt), "EEEE, MMMM d, yyyy")
    : "unknown";
  let content = `=== EMAIL ===\nReceived: ${receivedLabel}\nFrom: ${message.sender}\nSubject: ${message.subject}\n\n${
    message.bodyText.trim() || "(empty body)"
  }\n`;

  for (const attachment of message.attachments) {
    if (attachment.pages) {
      attachment.pages.forEach((pageText, i) => {
        content += `\n=== ATTACHMENT: ${attachment.name}, PAGE ${i + 1} ===\n${pageText}\n`;
      });
    } else {
      content += `\n=== ATTACHMENT: ${attachment.name} ===\n${attachment.text}\n`;
    }
  }

  return content;
}

export async function extractItemsFromMessage(
  message: MessageContent,
  familyMembers: FamilyMember[]
): Promise<ExtractedItem[]> {
  const roster = familyMembers.map((m) => m.name).join(", ");

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: `You extract structured entries from a family's email (body text and any attachments). Family members: ${roster}.

First, decide if this email is personal to the family — school, sports/activities, medical, a friend or relative, a service the family actually uses (e.g. a photo order, a permission slip). If it's marketing, a cold sales pitch, a newsletter, a promotional "offer expires" / "sale ends" message, or bulk/automated mail unrelated to the family's real life, extract nothing and return an empty items array — a countdown on a sales offer is not a family task, even though it has a date.

Choose a "kind" per item:
- event: something that happens on the calendar at a date (a game, a practice, an appointment, a school ceremony).
- task: an action someone must do by a deadline (return a signed form, order spirit wear, submit a physical).
- reminder: a small note tied to a date or to an event (bring a large water bottle, wear chapel dress).
- advisory: a non-personal heads-up that affects getting around (a road/lane closure, "allow extra travel time", a construction notice). Advisories are about the household generally, not one person.

Only extract items with a concrete, determinable date. Skip vague mentions with no date. The email's "Received" date (given above the body) is your anchor for resolving relative or year-ambiguous dates — "next Friday" means the Friday after that received date; "through August 5" or "March 12" with no year means the nearest such date on or after the received date, not a year from your own training data. Never invent a year that isn't grounded in the received date or explicit text. If a date genuinely can't be resolved even with that anchor, leave it null rather than guessing.

Put stated facts in their structured fields, not in notes: an end time goes in end_time, a place in location, a "report by"/"doors open"/"call time" in arrival_time, and classify the activity into category. Do NOT compute a default arrival time — only fill arrival_time when the text explicitly states one.

If a roster member's name is mentioned or clearly implied, set person_hint to their exact name; otherwise null. For every item, quote the exact source_excerpt that justifies it, and record whether it came from the email body or a specific attachment (and page, for PDFs).`,
    messages: [{ role: "user", content: buildPrompt(message) }],
    output_config: { format: zodOutputFormat(ExtractionResultSchema) },
  });

  return response.parsed_output?.items ?? [];
}
