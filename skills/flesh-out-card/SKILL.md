---
name: flesh-out-card
description: Turn a one-line Dueey card into a real, buildable spec by asking sharp clarifying questions grounded in the current repo and board, then drafting a description/checklist for approval before writing anything. Use when the user says "flesh out <card>", "flesh out this idea", or asks to expand/detail a thin Dueey card.
---

# Flesh Out Card

Expands a thin Dueey card (often just a title, maybe one sentence) into a real spec:
grounded description, acceptance criteria, and checklist — by asking the user a
small number of sharp, card-specific questions first, then drafting, then only
writing to Dueey after the user approves.

**Never skip straight to writing a draft.** The whole point of this skill over a
plain AI rewrite is the back-and-forth — do the questions, wait for real answers,
only then draft.

## Prerequisites

- The `dueey` MCP server must be connected — needs `get_card_context` (bundles
  the card + its board + sibling cards in one call) and `update_card` (writes
  the draft once approved). Requires a recent `dueey-mcp` build with these
  fields: `acceptanceCriteria`, `technicalNotes`, `effortEstimate`, `fileHints`
  on `update_card`. If `get_card_context` isn't available, fall back to
  `get_card` + `get_board` + `list_cards` separately — don't guess at card
  content either way.
- Ideally running inside the git repo that the card's project actually lives in
  (e.g. flesh out a StatLists card from the statlists repo, a dueey card from the
  dueey repo). If the current directory clearly isn't the right repo for the
  card's board, ask the user which repo to use, or proceed on board/other-cards
  context alone and say plainly that repo grounding was skipped.

## Steps

### 1. Load context — don't ask the user anything you can find yourself

1. `mcp__dueey__get_card_context` on the target card (id or cardKey). If not
   given, ask which card. This returns the card, its board (title/goal), and
   sibling cards on the same board in one call — skim the siblings so you don't
   propose something that duplicates or conflicts with existing work, and so
   you match the board's existing scope/voice.
2. Repo grounding (if in the right repo): search for existing code related to
   the card's subject — is there a half-built version already? A library
   already installed that's relevant? An existing pattern/component to reuse or
   a conflicting one to avoid duplicating? Note concrete file paths, not vague
   impressions.

Keep this step efficient — a handful of targeted greps/reads, not a full repo
audit.

### 2. Ask sharp, card-specific questions — not generic ones

Based on what step 1 turned up, ask 2-4 questions that are actually ambiguous
for *this* card — never generic filler like "what priority is this?" unless
priority is genuinely unclear from context. Good questions come from real
ambiguity you found, e.g.:

- Scope forks you can't resolve yourself ("per-board only, or across all
  boards?").
- A build-cost tradeoff you found in the repo ("there's already a `chart.tsx`
  wrapper unused — reuse it, or did you want something different?").
- Whether an existing half-finished related card/feature should be merged,
  superseded, or left alone.
- Any genuine "what does done look like" ambiguity.

Use the `AskUserQuestion` tool so answers are structured, unless the questions
are better as open-ended text — plain chat is fine too. Do not ask more than
one round before checking in.

### 3. Allow one follow-up round if the answers open new ambiguity

If an answer reveals a new fork you didn't anticipate, it's fine to ask a
short follow-up (1-2 questions) before drafting. Cap it there — two rounds
total, not an interrogation. If nothing new came up, go straight to drafting.

### 4. Draft — grounded, not generic, into the real fields

Produce, as plain chat output (not yet written to Dueey), mapped to Dueey's
actual structured card fields — don't cram everything into `description`:

- **description**: what it is, why it matters. Keep implementation notes out of
  here — they belong in `technicalNotes`.
- **technicalNotes**: repo-grounded implementation notes (existing files/libs
  to reuse, existing patterns to follow, things to avoid) discovered in step 1
  and shaped by the user's answers.
- **acceptanceCriteria**: a short list of concrete statements for what "done"
  means (this is its own array field, not bullets glued into the description).
- **checklist**: concrete, sequenced sub-tasks — specific enough that another
  agent could pick one up cold.
- **fileHints**: concrete repo paths relevant to the work, if you found any.
- Optionally: **effortEstimate** (`XS`/`S`/`M`/`L`/`XL`) and **priority**/
  **labels** *if* the conversation actually surfaced one — don't invent
  effort/priority out of nowhere.

Show this to the user as an editable-in-conversation preview, organized by
field so it's clear what goes where. Explicitly ask whether to apply it, tweak
it, or discard it — do not write to the card yet.

### 5. Apply only after explicit approval

Once approved (as-is or with edits the user gave), call
`mcp__dueey__update_card` with the final `description`, `technicalNotes`,
`acceptanceCriteria`, `checklist`, `fileHints`, and any `labels`/`priority`/
`effortEstimate` that came out of the conversation. Preserve existing
checklist items and acceptance criteria that are still relevant instead of
silently discarding them, unless the user's answers made them obsolete.

Confirm what was written (card key + a one-line summary of what changed, per
field) — don't just say "done."

## What NOT to do

- Don't draft and apply in the same step with no human checkpoint.
- Don't ask questions you could've answered yourself by reading the board/repo.
- Don't ask more than ~4 questions in the first round — this is meant to feel
  like a quick check-in, not a form.
- Don't invent repo details you didn't actually verify by reading files.
