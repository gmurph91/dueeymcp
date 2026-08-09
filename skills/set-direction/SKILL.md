---
name: set-direction
description: Have a real strategy conversation about a Dueey board/project — what it should become, what's blocking it, whether it's even worth continuing — then write the answer into the board's goal/description and seed a short list of directional next-step cards. Use when the user says "set direction for <board>", "where should <project> go next", or seems unsure what a project is even for right now.
---

# Set Direction

The PM job this skill does: figure out *what a project should become right now*,
not what feature to build next. That's `brainstorm`'s job, and turning a
chosen idea into a spec is `flesh-out-card`'s job. This one comes first.

**Never skip to writing the goal yourself.** The value here is the interrogation
— ask real questions, use real answers. If you already know the answer from the
board/repo, don't ask it; if you don't, don't guess at it either.

## Prerequisites

- `dueey` MCP server connected: `get_board`, `list_lists`, `list_cards` to read
  current state; `update_board` to write `goal`/`description`; `create_card` to
  seed directional next-step cards.
- Ideally run inside the repo the board's project actually lives in, so you can
  ground questions in what's actually built vs. stalled vs. abandoned in code.
  If you're not in the right repo, say so plainly and proceed on board data
  alone.

## Steps

### 1. Load what already exists — don't ask what you can find yourself

1. `get_board` for the target board (title, existing `goal`/`description`,
   `projectDescription`).
2. `list_lists` + `list_cards` (or `get_data`) to see current cards: what's
   done, what's stuck, what's stale, what's half-built.
3. If in the right repo: a few targeted greps/reads to check what's actually
   shipped vs. what the board claims — cards can lie about progress, code
   doesn't.

Form a quiet hypothesis about the state of the project (e.g. "this looks
abandoned for a while," "there's a burst of recent cards but no clear theme,"
"the goal field says X but recent cards are all about Y") — this is what makes
your questions sharp instead of generic.

### 2. Ask the direction questions — deep, not a form

Ask 3-5 questions that actually matter for deciding what this project is for
right now. Pull from what step 1 surfaced. Categories to draw from (don't ask
all of them — pick what's actually unclear):

- **Still worth it?** If the board looks stale/abandoned, ask directly whether
  to keep going, pause it, or kill it — don't assume "keep going."
- **Who's it for / what's the actual goal right now?** If the stated goal and
  the recent cards don't match, surface that mismatch and ask which one is
  real.
- **What changed?** Anything external (a competitor, a customer conversation,
  a decision made elsewhere) that should reshape this project's goal.
- **What's blocking it?** A technical blocker, a decision you've been avoiding,
  a dependency on another project.
- **What does "next milestone" look like**, concretely enough to know when
  you've hit it — not "improve X" but a real, checkable target.

Use `AskUserQuestion` for anything with a clean set of options; plain chat for
open-ended ones. One round is normal; a short follow-up round is fine if an
answer opens a new fork.

### 3. Draft the direction — show before writing

Produce, as a preview (not yet written):

- **goal** (or `description`/`projectDescription` — whichever field actually
  fits what changed): one to a few sentences, concrete, reflecting what was
  just decided — not vague ("improve the app") and not a to-do list.
- **3-5 directional next-step cards**: one-liners, not full specs — these are
  meant to be raw material for `brainstorm` or `flesh-out-card` later, not
  finished work. Each should trace back to something the user actually said in
  step 2.
- If the conversation concluded the project should pause/archive: say so
  plainly and propose that instead of forcing a "next steps" list that doesn't
  belong.

Ask whether to apply, tweak, or discard.

### 4. Apply only after approval

- `update_board` with the agreed `goal`/`description`.
- `create_card` for each agreed directional card (plain one-liners — resist
  fleshing them out here, that's a separate step/skill).

Confirm what was written: the new goal text, and the card keys/titles created.

## What NOT to do

- Don't write a goal that just restates the board title.
- Don't ask about things the board/repo already answers.
- Don't flesh cards out fully here — that's `flesh-out-card`'s job; these
  should stay one-liners.
- Don't assume "keep going" for a stale project — ask.
