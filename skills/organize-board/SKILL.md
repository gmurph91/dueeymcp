---
name: organize-board
description: Turn a pile of Dueey cards on a board into an actual working order — sequenced by what blocks what, effort, and real priority — asking the user tie-breakers only where genuinely ambiguous. Use when the user says "organize <board>", "what order should I do these in", or a board has grown a lot of cards with no clear order.
---

# Organize Board

The PM job this skill does: given cards that already exist (from
`set-direction`, `brainstorm`, or just accumulated over time), decide what
order to actually do them in — set position, flag blockers via links, and note
effort — so the board reads top-to-bottom as a real plan instead of a pile.

This is board-wide sequencing, distinct from `flesh-out-card` (specs one
card) and `claim_next_card`-style single-card picking. Run this *before*
picking what to work on next, so that picking becomes trivial (top of list).

**Don't silently reorder everything yourself.** Sequencing calls (what's truly
blocking, what's actually a quick win) are often judgment calls only the user
can make — surface them, don't guess.

## Prerequisites

- `dueey` MCP server connected: `list_lists` + `list_cards` (or `get_data`) to
  read the board; `update_card` (position, effortEstimate) and
  `link_card`/`unlink_card` (blocks/blocked_by) to apply the plan.
- Works best on one board at a time — for genuinely cross-project ordering
  ("what should I work on across all my projects"), that's a different,
  bigger problem than this skill solves; say so if asked to run it across many
  boards at once.

## Steps

### 1. Read the whole board

`list_lists` + `list_cards` (all lists, not just "To Do"). Note for each open
card: effort estimate (if set), any existing links (blocks/blocked_by), age/
position, and whether it reads like a quick win, a big lift, or genuinely
unclear.

### 2. Find the real structure

Look for, without asking the user yet:

- **Actual dependencies**: card B clearly can't start until card A is done,
  even if no link exists yet.
- **Duplicates or near-duplicates** that should be merged (flag, don't merge
  without asking).
- **Quick wins** worth front-loading (small effort, unblocks morale/momentum)
  vs. **big lifts** that need dedicated focus.
- **Cards that no longer make sense** given what else is on the board now
  (candidates to archive, not reorder).

### 3. Ask tie-breakers — only genuine ones

Ask about the things you can't resolve from the cards alone: which of two
plausible orderings the user actually wants, whether a stale-looking card
should be archived or is still wanted, whether a suspected dependency is real.
Don't ask about orderings that are obvious from effort/dependency alone — just
propose those.

### 4. Propose the plan before applying

Show, as a preview:

- The proposed top-to-bottom order (with a one-line reason per card where it's
  not obvious — "front-loaded, quick win" / "blocked on card X" / "moved down,
  no longer aligned with current direction").
- Any blocks/blocked_by links to add.
- Any cards proposed for archiving (not archived yet).

Ask for approval or edits before touching anything.

### 5. Apply only after approval

- `update_card` with `position` (or `top`/`bottom` keywords) to reflect the
  agreed order.
- `link_card` for agreed dependencies.
- `update_card` with `deletedAt` only for cards explicitly approved to
  archive.

Confirm the final order and every link/archive change made, per card.

## What NOT to do

- Don't reorder or archive anything without a shown-and-approved preview.
- Don't invent dependencies that aren't clearly real from the card content.
- Don't try to solve cross-board prioritization here — that's a different,
  larger problem.
