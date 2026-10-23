# Synchronized 5-Second Battle Mode Word Race Plan

## 1. Gameplay & UX Overview
We will transform Multiplayer Battle Mode (`activeSession.battleLobbyId` active) from an independent self-paced quiz into a synchronized, head-to-head **5-second word race** across all players in the lobby, while keeping solo stage play untouched.

- **Shared Simultaneous Word & 5-Second Countdown**:
  - Every player in the lobby views the exact same word (`currentCardIndex` from `0` to `19`) and translation direction (`KR_TO_EN` or `EN_TO_KR`) at the same time.
  - A high-visibility 5.0-second countdown bar and numeric timer (`5.0s` → `0.0s`) run at the top of the flashcard arena, shifting from emerald to amber to urgent coral-red in the final 2 seconds.
- **First-to-Answer Wins the Round & Streak Ownership**:
  - The first player to submit a valid translation claims the word, increments their `streak` by `+1`, and earns the round points (`100` base + up to `80` speed bonus based on remaining time in the 5s window + `streak * 20` streak bonus).
  - **Streak Preservation & Stealing**: A player's streak is **never** reset on a wrong guess. If a player with an active streak guesses wrong, their streak stays intact while they try again; their streak only resets to `0` if **another player** claims the correct answer before them!
  - As soon as any player claims the word (or the 5-second timer expires), the round enters a **1.2-second reveal flash** for all players simultaneously.
- **Immediate Input Wipe When Opponent Claims Word (or Timeout)**:
  - If a player is mid-typing when another player guesses correctly (or when the 5-second timer expires), their `#answerInput` value is **immediately cleared (`inputEl.value = ""`)** and locked during the 1.2s reveal banner, then automatically re-enabled, cleared, and focused as soon as the next word appears so leftover keystrokes never spill into the next word.
- **Wrong Guesses Stay on the Current Word**:
  - Submitting a wrong answer in Battle Mode does **not** advance or end the word, and does **not** reset the player's streak.
  - Instead:
    1. Their `#answerInput` is **immediately cleared** (`value = ""`) so they don't have to backspace.
    2. A **0.5-second freeze** (`500ms`) shakes the input box with a `"Wrong! Try again!"` badge before automatically re-enabling and re-focusing the input while the 5-second clock continues ticking.
    3. If the round ends while a player is in the middle of a 0.5s freeze, the freeze timer is cancelled and the input is cleanly reset for the next word.
- **Live Opponent Wrong-Guess Flashes**:
  - When any player submits a wrong guess, their card in the **Live Battle Standings** strip flashes red (`✗ WRONG TRY!`) for ~900ms on all players' screens, amplifying the fast-paced competitive feel.
- **5-Second Timeout (No Correct Guesses)**:
  - If 5.0 seconds elapse with no correct submission from any player, no one receives points (`0 PTS`), all players' inputs are immediately wiped, a `"⏰ Time's Up! Correct Answer: ..."` reveal banner flashes for **1.2 seconds**, and the battle automatically advances to the next word.

---

## 2. Real-Time Synchronization Architecture (`lobbies/{lobbyId}`)
We will extend the lobby document state in `/index.html` (`multiplayerManager`) with synchronized round fields:
- `currentCardIndex`: `0..19` (shared active word index)
- `cardStartedAt`: `number` (epoch ms when the current 5s word started)
- `cardState`: `"active"` | `"resolved"`
- `roundWinnerUid`: `string | null`
- `roundWinnerName`: `string | null`
- `roundPoints`: `number`
- `roundAnswer`: `string`
- `roundReason`: `"claimed"` | `"timeout"` | `null`
- `nextCardAt`: `number` (epoch ms = `resolvedAt + 1200`)
- `players[uid].streak`: `number` (incremented when `uid` wins the round; reset to `0` only when a different player `roundWinnerUid !== uid` claims a round)
- `players[uid].lastWrongAt`: `number` (epoch ms of most recent wrong attempt, used to trigger live red flash on opponent cards)
- `players[uid].wrongCount`: `number` (tracked for accuracy calculation at match end)

### Atomic Round Claim & Transition Flow
1. **Claiming a Word (`claimBattleRoundWin`)**:
   - When a player submits a correct answer while `cardState === "active"`, we use a Firestore transaction (`runTransaction` imported from `firebase-firestore.js`, with a graceful fallback to `updateDoc` if offline/local) verifying that `lobby.currentCardIndex === roundIndex` and `lobby.cardState === "active"`.
   - Inside the claim update:
     - The winning player's `streak` increments (`(winner.streak || 0) + 1`) and their `score` and `correctCount` increase.
     - All other players in `lobby.players` have their `streak` reset to `0` because another player guessed the word before them.
   - If another player claimed the round milliseconds earlier, the transaction aborts cleanly and the local client immediately receives the winner's snapshot, wiping their input box, syncing their reset streak (`0`), and showing who beat them to the punch.
2. **5-Second Timeout Resolution (`resolveBattleRoundTimeout`)**:
   - A `50ms` interval ticker updates the 5.0s countdown bar.
   - When elapsed time reaches `5000ms` and `cardState === "active"`, the host (plus a `350ms` backup trigger from any non-host player in case of host lag) transitions `cardState` to `"resolved"` with `roundReason: "timeout"`.
3. **1.2-Second Reveal → Next Word (`advanceBattleRoundIfNeeded`)**:
   - Upon receiving `cardState === "resolved"` via `onSnapshot`:
     - Any active input text in `#answerInput` is immediately cleared (`inputEl.value = ""`) and disabled.
     - The 1.2s reveal banner displays either `⚡ [Player] claimed +[X] PTS!` or `⏰ Time's Up! No points awarded` along with the correct answer.
     - After `1200ms`, the round advances to `currentCardIndex + 1` with `cardState: "active"`, `cardStartedAt: Date.now()`, or transitions the match to `"finished"` after word 20 so all players enter the final Podium & Victory Points screen together.

---

## 3. Files to Modify
- **`/index.html`**:
  - Import `runTransaction` in the Firebase Firestore import block.
  - Add Battle Race CSS animations (countdown bar urgency pulse, wrong-guess input shake, opponent card red flash).
  - Update `renderFlashcardArena()` and `submitFlashcardAnswer()` to branch cleanly between Solo Mode (existing behavior) and Synchronized Battle Mode (5s timer bar, immediate input wipe on wrong guess + 0.5s freeze while preserving streak, atomic round claim that steals/resets other players' streaks, immediate input wipe on opponent win/timeout, and 1.2s round reveal overlay).
  - Update `multiplayerManager` (`hostStartBattle`, `subscribeToLobby`, `renderLiveBattleStrip`, and new helpers `claimBattleRoundWin`, `recordBattleWrongGuess`, `resolveBattleRoundTimeout`, `advanceBattleRoundIfNeeded`) to drive the synchronized 20-word race and transition all players to the final Podium screen upon completion.
