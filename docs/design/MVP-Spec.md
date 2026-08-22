# Family OS — MVP Spec

Working name: **Rufus** (chief-of-staff chat identity). Product name: TBD.

Purpose of this doc: define what ships in the MVP so we can move into Claude Code and turn it into an implementation plan. Design reference: `Design-System.md`, the published canvas, and the updated Today screen assets in `Design Concepts/stitch_Today_Mobk-up/` (`screen.png`, `code.html`) — that mock is built on our real tokens (mist/surface/ink/border, primary blue, coral/teal/gold/berry accents, Bricolage Grotesque + Instrument Sans) and is the current reference for the Today screen, including additions not yet reflected in the canvas: a pill tab row (Today / Scheduled / Message / Todo), header icon group (menu, mail, notifications, avatar), and a "View Calendar" + filter control on the Schedule card.

## Screens in scope

**Today (dashboard)**
Reminders ("Keep in mind"), Schedule (next few items), Todos ("Needs doing"), persistent chat bar. This exists today in the canvas/mockup — carry it forward as-is, adopting the updated header and tab row from the stitch mockup.

**Schedule (full calendar)**
Same visual system as Today (cards, spacing, type, color) — not a separate look. Requirements:
- View modes: Day, 3-Day, Week, Month; user can switch between them.
- Date navigation (forward/back, jump to today).
- Filter: All (default) or a single family member — reuses the person-color coding from the design system.
- Add event: manual entry from this screen (form: title, person, date/time, location, notes).
- Chat bar present at the bottom, same as Today — schedule changes can also be made conversationally from here.

**Chat (Message)**
The persistent chat bar is the entry point everywhere; whether "Message" is also a dedicated full-screen thread view is an open question for the Claude Code planning session — not blocking for MVP scope, but the tab exists in the updated header so decide before build.

**Todo**
Tab exists in the updated header; full-screen todo view was not specified in detail — treat as same-pattern-as-Schedule (list + filter + add) and confirm scope in planning.

## Data ingestion — three entry paths into the same event/task store

1. **Manual** — standard form entry (Schedule screen "add event", or a todo equivalent).
2. **Chat / natural language** — e.g. "Liam has a soccer game Friday at 3:00 at the middle school" → parsed into a structured event (person, date/time, title, location) and confirmed back to the user before saving.
3. **Email scan** — reads incoming email (starting with Gmail) and detects events to add. Real example on file: a message from `bstpierre@stjohnsprep.org` ("Varsity/JV Football") with a `2026 Preseason Schedule.docx` attachment. This is representative of the hard case: relevant dates can be in the **email body as prose** ("boys should arrive for 845 and we should be done by noon") *and* in a **structured attachment** (docx/pdf schedule). MVP ingestion needs to handle both: body-text extraction and attachment parsing (docx/pdf at minimum), both going through the same NL-to-event extraction as path 2, with a review/confirm step before anything lands on the calendar — auto-adding from a scanned email without confirmation is a trust risk for a first version.

All three paths write to one underlying event store, and all events (regardless of source) are also indexed into a **knowledge base** so the chat can answer questions like "when is Liam's soccer game" — this means events need to be stored with enough structure (person, category, date/time, location, source) to be queried, not just displayed.

## Identity & infrastructure

- **No identity/auth system in the MVP.** Single-household, single-user assumption for now.
- **Hosting, database, and core infrastructure should match the stack already used by the other projects in this workspace (including Distilled)** rather than standing up something new — confirm the exact stack (hosting provider, DB, framework conventions) at the start of the Claude Code session rather than assuming here.

## Explicitly out of scope for MVP

- Multi-user / multi-household support, auth, permissions
- Push notifications
- Non-Gmail email providers (start with Gmail only)
- Voice input actually wired up (UI affordance exists; functionality TBD)
- Todo full-screen view details (see above — confirm in planning)

## Open questions for the Claude Code planning session

- Exact hosting/DB/framework stack to mirror from Distilled
- Whether "Message" is its own screen or just the persistent chat bar
- Confirmation UX for auto-detected calendar events (inline card? separate review queue?)
- Which document types email-scan must support at launch beyond docx/pdf (images/screenshots of flyers are common from schools)
