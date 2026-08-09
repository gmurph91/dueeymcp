---
name: brainstorm
description: Interactively brainstorm new ideas for a Dueey board — a real back-and-forth that turns a stated direction or a vague itch into a concrete, non-duplicate shortlist of new cards. Use when the user says "brainstorm for <board>", "what could <project> do next", or wants to generate new ideas rather than expand or prioritize existing ones.
---

# Brainstorm

The PM job this skill does: turn "what could this become" into a small set of
concrete candidate cards. This sits after `set-direction` (which sets *why*)
and before `flesh-out-card` (which specs out *one* chosen idea) and
`organize-board` (which sequences everything once it exists).

**Never just generate a list of AI ideas and dump it.** The point is the
back-and-forth — react to what the user says, push on vague answers, converge
on a short list they actually want, not a wall of options.

## Prerequisites

- `dueey` MCP server connected: `get_board`, `list_lists`, `list_cards` (to
  avoid duplicating existing cards); `create_card` to write the agreed
  shortlist.
- Run inside the project's repo when possible — real brainstorming should be
  grounded in what's actually built, what libraries/patterns already exist,
  and what would be cheap vs. expensive, not generic feature ideas.

## Steps

### 1. Load context

1. `get_board` (goal/description — if it's thin or missing, this session will
   surface direction gaps too; you can suggest running `set-direction` first
   if the board genuinely has no sense of purpose).
2. `list_lists` + `list_cards`: know what already exists so you never propose
   a near-duplicate of a live or recently-done card.
3. If in the right repo: skim for existing capabilities/patterns relevant to
   likely idea directions — this turns "add analytics" into "there's already
   a `charts.tsx` wrapper unused, could extend that" which is a far sharper
   seed for the conversation.

### 2. Open the conversation — don't lecture, converse

Don't start by listing 10 ideas. Start by asking what's prompting the session
right now — a problem they hit, a competitor thing they saw, boredom with the
current backlog, an explicit goal from `set-direction`. Then:

- Reflect back 1-2 directions grounded in what you found in step 1 (real repo
  facts, real board gaps) and ask which resonates, or if neither does.
- Push on vague answers ("more engagement" → engagement for whom, doing what,
  measured how) instead of accepting them and moving on.
- It's fine to offer a few concrete options once the conversation has enough
  shape — but make them specific and grounded, not generic feature-brainstorm
  filler.

Keep it a dialogue: propose, get reaction, refine, repeat — not a single
question-and-answer round.

### 3. Converge on a shortlist

Once a handful of ideas feel real (not "maybe someday" musing), list them back
as a preview: title + one-line rationale each, flagged against anything they
overlap with in the existing backlog (step 1). Ask which to actually create as
cards — it's fine if the answer is "only 2 of these," that's a good outcome,
not a failure to generate more.

### 4. Create only the approved ones

`create_card` for each approved idea as a plain one-liner + short description
— resist the urge to fully spec them here. If the user wants one fully fleshed
out immediately, say so and hand off to `flesh-out-card` rather than doing
both jobs in one pass.

Confirm what was created (card keys + titles) and name anything discussed but
deliberately not created.

## What NOT to do

- Don't dump a big generic idea list before understanding what's actually
  bugging the user or what direction they're leaning.
- Don't create cards no one approved just because they came up in conversation.
- Don't propose ideas that duplicate or trivially restate an existing open
  card — check first.
- Don't fully flesh out the winning idea(s) here — that's a separate step.
