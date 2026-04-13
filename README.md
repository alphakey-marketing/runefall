# Game Design Document: Project RUNEFALL
### Auto-Combat Dungeon Crawler — Revised Edition

**Version:** 0.3 — Optimized Milestone Revision
**Stack:** Vite + React (UI & Logic) + Canvas 2D (Battle Animation Layer)
**Platform:** Browser (Desktop + Mobile)
**Genre:** Auto-Combat RPG / Dungeon Crawler
**Tone:** Dark Fantasy — Rune-inscribed world where constellations grant power
**Core Promise:** All depth is in *preparation*. Players win by building smart, not by playing fast.

---

## 1. Executive Summary

RUNEFALL is a browser-based Auto-Combat Dungeon Crawler. Players assemble a build using a
classless **Rune Linking system**, navigate a constellation-shaped **Zodiac Passive Tree**,
and equip procedurally generated gear — then send their Runebound hunter into dungeons and
watch their preparation play out automatically.

There is no twitch skill required. Victory or defeat is determined entirely before combat
begins. This creates a pure **theory-craft loop**: simulate → observe → adjust → go deeper.

The core addictive loop:

> **Build → Enter Dungeon → Watch Combat → Loot → Upgrade Build → Enter Harder Dungeon → Repeat**

---

## 2. Core Design Pillars

| Pillar | Description |
|---|---|
| **Preparation Over Reflexes** | The entire game is solved in menus. Combat is the proof-of-concept for your build |
| **Classless Identity** | No class lock-in. Your rune combination IS your class |
| **Infinite Ceiling** | There is always a harder dungeon, a better affix, a stronger link combination |
| **Readable Feedback** | Every number matters. Players must understand *why* they died |
| **Session Flexibility** | A 5-minute dungeon run feels complete. A 2-hour session feels rewarding |

---

## 3. Combat Architecture (Auto-Combat Tick System)

This is the most important design decision. Combat is a **deterministic tick simulation**,
not a real-time physics engine.

### How It Works

Every **500ms**, the game engine runs one "combat tick":
TICK LOOP (runs every 500ms via setInterval):
1. Player skills fire based on cooldown timers
2. Skill damage calculated: baseDamage × runeModifiers × zodiacBonuses × gearStats
3. Status effects applied to enemies (Burn, Chill, Shock, Bleed, Poison)
4. Enemy attacks fire based on their attack speed
5. Player takes damage (mitigated by gear defense + Zodiac bonuses)
6. Status effects tick damage on both sides
7. Check win/lose condition (all enemies dead OR player HP = 0)
8. Emit combat event log entry → React state → renders in Battle Log UI
9. 
**Screens (React components):**
- **Build Screen** — Rune slot manager, link configuration, active skill preview
- **Inventory Screen** — 5 gear slots, item bag, tooltip comparison, salvage button
- **Zodiac Screen** — SVG node graph, point counter, respec button
- **Dungeon Screen** — Tier map, modifier preview, Enter button, Hall of Records tab
- **Crafting Bench** — Currency inputs, item slot, outcome preview
- **Battle Screen** — Canvas animation panel + combat log + post-battle loot
- **Settings Screen** — Sound, speed, color blind mode, reset save

---

## 6. Development Milestones

---

### 🟢 MILESTONE 1 — Combat Simulation Engine
**Goal:** Combat resolves correctly as a tick simulation. No visuals yet — just logic.

**Deliverables:**
- [ ] `CombatEngine.js` — pure function: `runCombat(player, enemies) → combatLog[]`
- [ ] `combatTick()` — calculates one round: player skills fire, enemy attacks fire, statuses tick
- [ ] `playerStats` object: HP, mana, attackSpeed, skills[]
- [ ] `Enemy` template: `{ name, hp, armor, attackDamage, attackSpeed, resistances }`
- [ ] Hardcode 3 enemies and 1 skill to test the loop
- [ ] Console-log the full combat log (no UI yet)
- [ ] Win/lose detection with log entry
- [ ] Unit test: same inputs always produce same outputs (deterministic)

**Tech:** Pure JS module — no React, no Canvas yet
**Estimated time:** 3–5 days

---

### 🟢 MILESTONE 2 — Skill Rune Data System
**Goal:** Skills and links are data objects. Linking runes changes damage output.

**Deliverables:**
- [ ] `skillRunes.json` — 8 skill runes with base stats and `unlockLevel`
- [ ] `linkRunes.json` — 12 link runes with modifier functions and `unlockLevel`
- [ ] `SkillResolver.js` — takes `(skillRune, links[])` → returns resolved damage profile
- [ ] Link modifier functions as pure transforms: `(skill) => ({ ...skill, damage: skill.damage * 1.45 })`
- [ ] Mana cost calculation: base cost × each link's cost multiplier
- [ ] Cooldown calculation: base cooldown ÷ attack speed stat
- [ ] `buildSkillFromSlot(slot)` → fully resolved skill ready for CombatEngine

**Tech:** Data files in `/src/data/`, resolver in `/src/systems/`
**Estimated time:** 4–6 days

---

### 🟢 MILESTONE 3 — React UI Shell + Build Screen
**Goal:** Player can equip runes and see their resolved skill stats in a UI.

**Deliverables:**
- [ ] Vite + React project scaffolded
- [ ] Bottom navigation bar: Build / Inventory / Zodiac / Dungeon / Craft / Settings
- [ ] **Build Screen**: 5 skill slots, click slot → open rune picker modal
- [ ] Rune picker: lists only unlocked runes filtered by `player.level >= rune.unlockLevel`
- [ ] Locked runes shown greyed out with "Unlocks at Lv. X" label
- [ ] Link slot UI per skill: shows 1–6 sockets, click socket → link rune picker
- [ ] Live stat preview panel: shows resolved damage, mana cost, cooldown for each skill
- [ ] Player stats panel: HP, mana, attack speed, total Gear Score
- [ ] Global `playerState` context (React Context API)

**Tech:** React + Vite, CSS Modules
**Estimated time:** 1 week

---

### 🟢 MILESTONE 4 — Loot System + Inventory Screen
**Goal:** Items are generated with random affixes. Player equips gear and stats update.

**Deliverables:**
- [ ] `affixPool.json` — 20+ affixes with min/max ranges and stat keys
- [ ] `generateItem(tier, slot)` — creates randomized item object
- [ ] `ItemTooltip` React component — shows all affixes, Gear Score, and delta vs. equipped
- [ ] **Inventory Screen**: 5 gear slots (equipped) + 20-slot bag
- [ ] Equip/unequip items; `playerStats` recalculates immediately
- [ ] Salvage button: removes item → adds Rune Dust to currency
- [ ] "Drop test" button (dev mode): generates random loot for testing
- [ ] Item rarity color coding (White / Blue / Yellow / Orange)

**Tech:** React state + context
**Estimated time:** 1 week

---

### 🟡 MILESTONE 5 — Dungeon Screen + First Playable Loop
**Goal:** The complete game loop works end-to-end. Build → Enter → Fight → Loot.

**Deliverables:**
- [ ] **Dungeon Screen**: Tier 1–5 selector, modifier preview panel, Enter button
- [ ] Dungeon generates 3 rooms (wave config from JSON)
- [ ] Clicking Enter runs `CombatEngine` with current `playerStats` vs. room enemies
- [ ] **Battle Screen**: displays combat log line by line with 300ms delay between entries
- [ ] Simple Canvas panel: player shape left, enemy shape right, HP bars, floating numbers
- [ ] Post-battle loot screen: shows dropped items, click to pick up or salvage
- [ ] Tier Key drop on dungeon clear → unlocks next Tier
- [ ] Player death screen with stats and retry button
- [ ] XP awarded on clear → feeds level system (next milestone)

**Tech:** Canvas 2D for battle animation; React for all surrounding UI
**Estimated time:** 10–14 days

---

### 🟡 MILESTONE 6 — Level System + Zodiac Tree
**Goal:** Players level up, earn Zodiac Points, and navigate a visual passive node graph.

**Deliverables:**
- [ ] XP curve: `xpRequired(level) = 100 × level^1.5`
- [ ] XP rewards follow the XP-per-tier table in Section 4.5
- [ ] Level-up popup with animation; awards 1 Zodiac Point per level
- [ ] `zodiacTree.json` — 3 full constellations (30 nodes + 3 Keystones) to start
- [ ] **Zodiac Screen**: SVG-rendered node graph; nodes connected by lines
- [ ] Click to allocate node (validates path requirements in reducer, deducts point)
- [ ] Allocated nodes glow; locked nodes are dim; allocatable nodes pulse
- [ ] Keystone nodes: larger icons with unique visual treatment
- [ ] `zodiacBonuses` computed from all allocated nodes → merged into `playerStats`
- [ ] Respec cost: 50 Rune Dust per node — validated in reducer, not only UI

**Tech:** SVG node graph in React; position data stored in JSON
**Estimated time:** 2 weeks

---

### 🟡 MILESTONE 7 — Status Effects + Elemental Interactions
**Goal:** Status effects change combat meaningfully. Element combos create satisfying power spikes.

**Deliverables:**
- [ ] `StatusEngine.js` — manages active statuses per entity: apply, stack, tick, expire
- [ ] All 5 statuses: Burn, Chill/Freeze, Shock, Bleed, Poison
- [ ] Freeze mechanic: enemy skips 1 tick (combat log: "FROZEN — skipped turn")
- [ ] All 5 interaction combos implemented:
  - Burn + Bleed → Hemorrhage (burst on expiry)
  - Chill ×3 → Freeze (skip turns)
  - Shock + Freeze → Shatter (AoE explosion)
  - Bleed + Poison → Sepsis (double tick rate)
  - Poison + Burn + *Pandemic* keystone → Plague (spreads on kill)
- [ ] Combat log shows interactions: `"Shock + Freeze → SHATTER for 892 damage!"`
- [ ] Monster resistances in template JSON: some enemies immune to certain elements
- [ ] Resist-piercing mechanic via Penetration link rune

**Estimated time:** 1 week

---

### 🟡 MILESTONE 8 — Crafting Bench + Economy
**Goal:** Players can improve gear without pure RNG dependency.

**Deliverables:**
- [ ] **Crafting Bench Screen**: select item from inventory, choose operation, preview outcome
- [ ] Reroll affix: removes one random affix, adds new random from pool (Rare only)
- [ ] Augment: adds one affix to a Magic item (max 2 affixes → becomes Rare)
- [ ] Corrupt: 6-outcome random table (powerful implicit / nothing / lose affix / gain affix / reroll all / downgrade to Magic)
- [ ] Legendary recipe: combine **3 same-slot Rares** (validated in UI and logic) — 25% Legendary, 75% returns Magic
- [ ] Rune Upgrade: spend 200 Dust → rune tier +1 (+10% base damage, max tier 5)
- [ ] Currency display updated after every transaction

**Estimated time:** 1 week

---

### 🟠 MILESTONE 9A — Rune Library Complete
**Goal:** All skill and link runes exist in data and fire correctly in combat.

**Deliverables:**
- [ ] Expand to all 12 Skill Runes in `skillRunes.json` with correct `unlockLevel` values
- [ ] Expand to all 20 Link Runes in `linkRunes.json` with correct `unlockLevel` values
- [ ] Trigger Links fully implemented in `CombatEngine.js`:
  - `On Kill` — fires linked skill when any enemy dies
  - `On Hit` — fires linked skill on every hit landed
  - `On Low HP` — fires linked skill when player drops below 30% HP
  - `On Full Mana` — fires linked skill when mana reaches 100%
- [ ] Build Screen filters runes by `player.level >= rune.unlockLevel`
- [ ] Locked runes display "Unlocks at Lv. X" in the picker

**Estimated time:** 1 week

---

### 🟠 MILESTONE 9B — Full Zodiac Tree
**Goal:** All 12 constellations are defined, rendered, and their keystones fire in combat.

**Deliverables:**
- [ ] All 12 constellations defined in `zodiacTree.json` (120 minor nodes + 12 Keystones)
- [ ] All 12 Keystones implemented in `CombatEngine.js`:
  - Conflagration, Shatter, Overcharge, Hemorrhage, Pandemic
  - Iron Will, Wither, Windstep, Blood Mage, Blademaster
  - Necromancer's Mark, Fortune's Edge
- [ ] Full tree renders correctly in the SVG Zodiac Screen
- [ ] Ascendancy node slots reserved in the tree (visible but locked, labelled "Ascendancy")

**Estimated time:** 2 weeks

---

### 🟠 MILESTONE 9C — Legendary Items + Offline Build Planner
**Goal:** The build space feels complete. Players can theory-craft without entering a dungeon.

**Deliverables:**
- [ ] 10 unique Legendary item effects designed and implemented (e.g., "Fireball leaves a
  burning ground zone", "Frost Arrow pierces and chills all enemies in path")
- [ ] Legendary affixes added to `affixPool.json` under `"tiers": ["legendary"]`
- [ ] **Offline Build Planner** tab inside Build Screen: simulate combat against a configurable
  test dummy (set dummy HP, armor, resistances) without entering a dungeon
- [ ] Planner output: full simulated combat log + total damage + estimated clear time

**Estimated time:** 1–2 weeks

---

### 🟠 MILESTONE 10 — Dungeon Depth & Monster Variety
**Goal:** High-tier dungeons feel genuinely dangerous and mechanically distinct.

**Deliverables:**
- [ ] Expand to 20 Chaos Tiers (Tiers 1–10 tutorial curve, 11–20 endgame)
- [ ] 15 monster templates: 3 archetypes × 5 element variants (Fire Golem, Ice Golem, etc.)
- [ ] Elite monsters: appear in Tier 8+, have 1 special mechanic (shield phase, summon adds, enrage)
- [ ] Boss designs: one unique boss per 5 tiers with 2-phase fight logic
- [ ] Full dungeon modifier pool: 20 modifiers balanced for engagement, not frustration
- [ ] Monster scaling formula: `monsterHP(tier) = baseHP × (1 + 0.12 × tier)`
- [ ] Monster damage scaling: `monsterDamage(tier) = baseDamage × (1 + 0.10 × tier)`

**Estimated time:** 2 weeks

---

### 🔵 MILESTONE 11 — Onboarding + Save System + Settings
**Goal:** New players understand the loop in 3 minutes. Returning players never lose progress.

**Deliverables:**

**Starter Kit**
- [ ] `initialState` ships with: Frost Arrow in Slot 1, More Damage link in Socket 1,
  Iron Sword in Weapon slot, 50 Rune Dust
- [ ] Intro dungeon auto-presented on first load: **Runefall Gate (Tier 0)** — 1 combat
  room + 1 boss room with reduced HP
- [ ] On Tier 0 clear: award 100 XP, 100 Rune Dust, and a random Magic-tier item
  matching the player's equipped weapon element (not a fixed fire reward)
- [ ] Tier 0 completion flag stored in `playerState.tutorialComplete`; never shown again

**Tutorial Tooltip System**
- [ ] `TutorialManager.jsx` — in-memory seen-flag object (no localStorage)
- [ ] Build Screen first visit: tooltip on Skill Slot 1
- [ ] Dungeon Screen first visit: tooltip on Enter button
- [ ] Zodiac Screen first visit with unspent points: tooltip on nearest allocatable node
- [ ] First death: tooltip on retry button
- [ ] All tooltips dismissible; never reappear in the same session

**Save System**
- [ ] `LOAD_SAVE` action in `PlayerContext.jsx` — replaces entire state
- [ ] Export button in Header → downloads `runefall-save.json` as a blob
- [ ] Import button in Header → file picker, reads `.json`, dispatches `LOAD_SAVE`
- [ ] Save file includes: skills, gear, zodiac nodes, records, completed challenges,
  `tutorialComplete` flag

**Settings Screen**
- [ ] Settings tab added to bottom nav (⚙️)
- [ ] Sound: On / Off toggle (wired up fully in M15)
- [ ] Combat Speed: 0.5× / 1× / 2× selector (syncs with in-battle toggle)
- [ ] Color Blind Mode: replaces element color coding with shape icons
  (◆ fire, ● ice, ▲ lightning, ■ physical, ✦ poison)
- [ ] Reset Save: wipes `playerState` to `initialState` with a confirmation prompt

**Estimated time:** 5–7 days

---

### 🔵 MILESTONE 12 — Visual Combat Layer (Canvas 2D)
**Goal:** Battle feels alive. The player watches their build play out as a visual story.

**Deliverables:**

**Sprite System**
- [ ] v1 sprites use **geometric shapes** — player = glowing rune circle, enemies shaped
  by archetype (humanoid = upright rectangle, beast = low wide shape, elemental = orb)
- [ ] `SpriteRenderer.js` — draws entity at correct canvas position; handles idle pulse animation
- [ ] Player sprite: left 25% of canvas. Enemy sprites: right 25–75%, stacked vertically

**Skill Animations**
- [ ] `SkillAnimator.js` — maps each element to a visual:

| Element | Animation |
|---|---|
| Ice | Blue projectile arc |
| Fire | Orange expanding burst |
| Lightning | Yellow zigzag line |
| Physical | White slash arc |
| Poison | Green cloud expand |
| Chaos | Purple distortion ring |

- [ ] Animations are cosmetic — replay already-computed combat log
- [ ] Each animation lasts 300ms; queued sequentially

**Floating Damage Numbers**
- [ ] Damage number spawns at enemy position, floats up 40px, fades over 600ms
- [ ] Crits: larger font, gold color, `!` suffix
- [ ] Status ticks: smaller font, element color

**HP Bar Animations**
- [ ] CSS `transition: width 400ms ease-out` on all HP bars (not canvas-drawn)
- [ ] Player bar top-left; enemy bars above each sprite
- [ ] Bar flashes red on hit

**Status Effect Icons**
- [ ] Row of icons beneath each entity: 🔥 ❄️ ⚡ 🩸 ☠️ 🧊
- [ ] Stack count badge on each icon

**Combat Speed Toggle**
- [ ] `0.5×` `1×` `2×` buttons visible during battle
- [ ] Adjusts tick interval: `500ms / multiplier`
- [ ] Syncs with Settings Screen selector

> **Note:** Full pixel art sprites are a post-v1 enhancement. Geometric shapes ship first
> to protect the timeline while keeping all animation logic intact.

**Estimated time:** 2–3 weeks

---

### 🔵 MILESTONE 13 — Endgame Systems
**Goal:** Players who clear Tier 10 have a reason to keep going. The ceiling is infinite.

**Deliverables:**

**Ascendancy System**
- [ ] Unlocks at **Level 15** (reachable in ~25–30 Tier 5 runs)
- [ ] One-time modal: *"You have mastered the runes. Choose your Ascendancy."*
- [ ] Three paths:

| Name | Passive Bonus | Playstyle |
|---|---|---|
| **Runebound** | All skill runes gain +1 base hit per tier; Link Runes cost 50% less mana | Generalist |
| **Hexblade** | Melee skills deal 30% bonus Chaos damage; Chaos ignores all resistances | Melee/Chaos |
| **Stormbringer** | Lightning skills chain to 2 extra targets; Shock duration doubled | Lightning AoE |

- [ ] Choice is permanent per save file; stored in `playerState.ascendancy`
- [ ] Each path adds 6 exclusive nodes to the Zodiac tree (visible but locked until chosen)
- [ ] `SET_ASCENDANCY` action added to `PlayerContext.jsx`
- [ ] Ascendancy modifiers applied in `StatsCalculator.js`

**Tier Key Modifier System**
- [ ] Cleared dungeons drop a Tier Key with 1–3 random modifiers from `tierKeyModifiers.json`:

| Modifier | Effect |
|---|---|
| Amplified | +50% enemy HP, +100% item quantity |
| Volatile | Enemies explode on death (10% max HP AoE) |
| Haunted | Elite enemy in every room |
| Enriched | +200% Rune Dust, -20% XP |
| Cursed | Player starts at 50% HP; +300% item rarity |
| Empowered | +2 Chaos Tier difficulty; +200% all rewards |
| Fractured | Bosses appear in every room |

- [ ] Modifier count correlates to loot multiplier shown on Dungeon Screen before entering
- [ ] Keys are consumed on dungeon entry; shown in a Key inventory below the Tier selector

**Hall of Records**
- [ ] Tab inside Dungeon Screen
- [ ] Tracks: Highest Tier Cleared, Most Damage in a Single Hit, Fastest Dungeon Clear (in ticks),
  Total Enemies Slain, Total Rune Dust Spent, Favourite Skill Rune (most damage dealt overall)
- [ ] Records persist inside the save file under `playerState.records`
- [ ] Displayed with timestamps and build snapshot (skill rune names at time of record)

**Estimated time:** 2 weeks

---

### 🔵 MILESTONE 14 — Challenge System + Daily Runs
**Goal:** Give returning players a daily reason to log in and a structured challenge ladder.

**Deliverables:**

**Daily Challenge**
- [ ] Each day seeds a fixed dungeon config: locked Tier, locked modifiers, locked enemy set
- [ ] Seed derived from `new Date().toDateString()` → deterministic for all players that day
- [ ] Daily Challenge uses a **snapshot build** — build is locked at time of entry, cannot change mid-run
- [ ] Completion awards a special cosmetic Rune Dust colour variant (visual only, no power)
- [ ] Completion flag stored in `playerState.dailyLastCompleted` (date string); resets daily

**Challenge Ladder**
- [ ] 30 handcrafted challenges defined in `challenges.json`:

| # | Name | Condition | Reward |
|---|---|---|---|
| 1 | First Blood | Clear any dungeon | 200 Rune Dust |
| 2 | Glass Cannon | Clear Tier 3 with 0 HP gear affixes | 300 Rune Dust |
| 3 | Mono-Element | Clear Tier 5 using only Fire skills | 400 Rune Dust |
| 4 | The Untouchable | Clear a dungeon without the player taking damage | 500 Rune Dust |
| 5 | Speed Runner | Clear Tier 5 in under 30 ticks total | 500 Rune Dust |
| 6 | Poison Apostle | Kill 500 enemies with Poison damage | 600 Rune Dust |
| 7 | Keystone Hunter | Allocate 3 Keystones simultaneously | 600 Rune Dust |
| 8 | One Rune Army | Clear Tier 8 with only 1 skill rune equipped | 750 Rune Dust |
| 9 | Corrupted | Successfully corrupt an item 5 times | 400 Rune Dust |
| 10 | True Ascendant | Clear Tier 10 post-Ascendancy | 1000 Rune Dust + Legendary item |
| ... | ... | ... | ... |
| 30 | Runefall Master | Clear Tier 20 with all 5 skill slots filled with Trigger Links | 5000 Rune Dust |

- [ ] Challenge progress tracked in `playerState.challenges[]` (id, progress, completed flag)
- [ ] Completed challenges shown with a gold checkmark; locked ones show condition text
- [ ] Partial progress displayed for numeric challenges (e.g., "312 / 500 enemies")
- [ ] Challenge list accessible from a tab inside the Dungeon Screen

**Estimated time:** 1–2 weeks

---

### 🔵 MILESTONE 15 — Audio + Polish Pass
**Goal:** The game feels finished. Sound, animation timing, and UX micro-details are complete.

**Deliverables:**

**Audio System**
- [ ] `AudioManager.js` — Web Audio API wrapper; loads and plays sound effects
- [ ] Sound effects (sourced from freesound.org CC0 or generated):

| Event | Sound |
|---|---|
| Skill fires | Short whoosh (element-variant: crackle/ice/thunder) |
| Hit lands | Impact thud |
| Critical hit | Sharp crack + pitch shift up |
| Enemy dies | Low thud / crumble |
| Level up | Rising chime arpeggio |
| Loot drop | Soft chime |
| Legendary drop | Distinct fanfare (3 notes) |
| Player death | Low reverb drone |
| Keystone allocated | Deep resonant bell |

- [ ] Background music: 2 tracks (dungeon ambient loop, build-screen calm loop)
  sourced from OpenGameArt CC0
- [ ] Settings Screen sound toggle wires to `AudioManager.setMuted(bool)`
- [ ] Volume slider (0–100%) wired to `AudioManager.setVolume(float)`

**Animation Polish**
- [ ] Level-up popup: `clip-path` expand from center, star burst effect, auto-dismiss after 2.5s
- [ ] Loot drop cards: stagger-animate in with 80ms delay between each card
- [ ] Zodiac node allocation: pulse ring ripples outward from node on click
- [ ] Keystone allocation: full-screen flash at 5% opacity in Keystone's element colour
- [ ] Rune equip: socket glows briefly when a link rune is dropped in
- [ ] Combat log entries: slide in from left with `transform: translateX(-12px)` → `0`
- [ ] Number counters (XP bar, Rune Dust): animate via `requestAnimationFrame` count-up

**UX Micro-Details**
- [ ] Tooltip delay: 400ms before tooltip appears (prevents tooltip flicker on fast mouse moves)
- [ ] Gear Score delta: green `▲ +42` / red `▼ -18` with colour-coded text
- [ ] Empty Skill Slot shows a pulsing `+` with "Click to add a skill rune" hint
- [ ] Empty Zodiac node shows point count badge: "2 points available" bounces on Zodiac tab icon
- [ ] Build Screen keyboard shortcut: pressing `1`–`5` opens that skill slot's rune picker
- [ ] Dungeon Screen auto-focuses the Enter button when the screen loads
- [ ] Post-battle summary shows total damage dealt, total damage taken, and ticks elapsed

**Estimated time:** 1–2 weeks

---

### 🟣 MILESTONE 16 — Mobile Optimization
**Goal:** The game is fully playable on a phone. Every interaction works without a mouse.

**Deliverables:**
- [ ] Responsive layout breakpoint at 768px: bottom nav collapses to icon-only (no labels)
- [ ] Build Screen on mobile: skill slots stack vertically; tap slot → full-screen modal picker
- [ ] Zodiac Screen on mobile: SVG tree is pinch-zoomable and pannable (touch events)
- [ ] Inventory on mobile: gear slots in a 2×3 grid; bag in a 4-column scrollable grid
- [ ] All touch targets verified ≥44×44px; padding added where needed
- [ ] Combat log font size: `--text-sm` on mobile (no smaller)
- [ ] Canvas battle panel: scales to 100% viewport width on mobile, 16:9 aspect ratio maintained
- [ ] No hover-only UI elements: all tooltips trigger on tap, dismiss on second tap or outside tap
- [ ] iOS Safari: `viewport-fit=cover` meta tag; safe-area insets applied to bottom nav
- [ ] Test matrix: iPhone SE (375px), iPhone 14 Pro (393px), iPad (768px)

**Estimated time:** 1 week

---

### 🟣 MILESTONE 17 — Build Sharing + Community Features
**Goal:** Players can share, compare, and clone each other's builds.

**Deliverables:**

**Build Export / Import**
- [ ] `encodeBuild(playerState)` → compact base64 string representing skills + links + zodiac nodes + gear affixes
- [ ] `decodeBuild(string)` → reconstructs build object, validates integrity (unknown rune IDs → stripped)
- [ ] "Copy Build Code" button in Build Screen header → copies string to clipboard
- [ ] "Import Build" button → text input modal, pastes code, loads build
- [ ] Imported build does NOT overwrite save file progress (XP, currency, records untouched);
  only skill slots, link configs, and zodiac allocations change
- [ ] Build code string is URL-safe: `runefall.app/?build=ABC123` loads the game with that build pre-loaded

**Build Summary Card**
- [ ] "Share Build" button generates a build summary card as a downloadable PNG (via Canvas `toDataURL()`):
  - Build name (editable text input, max 32 chars)
  - 5 skill rune names + their link rune names
  - 3 allocated Keystones
  - Top 3 gear affixes
  - Highest Tier cleared (from records)
  - RUNEFALL logo watermark

**Estimated time:** 1 week

---

### 🟣 MILESTONE 18 — Post-Launch Content Pack A: "The Hollow Court"
**Goal:** New content that adds 10+ hours of play for players who have cleared Tier 20.

**Deliverables:**

**New Dungeon Biome: The Hollow Court**
- [ ] Tiers 21–30 unlock after clearing Tier 20 with any Ascendancy
- [ ] New visual theme: crumbling throne room, spectral lighting (CSS filters on canvas sprites)
- [ ] 5 new monster archetypes: Shade Knight, Bone Archer, Wraith Mage, Void Crawler, Lich Herald
- [ ] Each archetype has a unique mechanic:
  - Shade Knight: reflects 10% of damage back as Chaos
  - Bone Archer: applies Bleed on every hit regardless of skill element
  - Wraith Mage: reduces player mana by 20% on hit
  - Void Crawler: immune to one random element each fight (shown in enemy info panel)
  - Lich Herald: resurrects once at 1 HP (combat log: `"Lich Herald rises from the dead!"`)

**New Skill Runes (2)**
- [ ] `Chaos Bolt` — Spell / Chaos: ignores all resistances; unpredictable damage range (80–200% of base)
- [ ] `Smoke Bomb` — Melee / Physical: fast twin strikes; applies Bleed on both hits; resets cooldown if both hit

**New Link Runes (3)**
- [ ] `Life Leech` — restores HP equal to 2% of damage dealt
- [ ] `Spell Echo` — spells repeat once after 200ms at 50% damage (Spell skills only)
- [ ] `Detonation` — on kill: all consumed status effects explode for AoE bonus damage

**New Keystones (2)**
- [ ] `Soul Harvest` (Wisp constellation) — each enemy killed permanently grants +0.5% damage (resets on death)
- [ ] `Void Walker` (Void constellation) — player becomes immune to all status effects;
  instead, each status that would be applied grants +8% damage for 3 ticks

**New Legendary Items (5)**
- [ ] *The Hollow Crown* (Helmet) — "Your skills gain the Chaos element in addition to their base element"
- [ ] *Ashbone Gauntlets* (Gloves) — "On kill: next skill fired deals 300% increased damage"
- [ ] *Voidstep Treads* (Boots) — "After taking damage, next skill fires twice for free"
- [ ] *Sundered Blade* (Weapon) — "Critical strikes apply all 5 status effects simultaneously"
- [ ] *Shroud of the Court* (Chest) — "Take 20% reduced damage per active status effect on any enemy"

**Estimated time:** 2–3 weeks

---

### 🟣 MILESTONE 19 — Post-Launch Content Pack B: "Rune Trials"
**Goal:** A structured solo competitive mode where players race against a fixed meta.

**Deliverables:**

**Rune Trials Mode**
- [ ] Separate mode accessible from Dungeon Screen: "Enter Trials" button (unlocked after Ascendancy)
- [ ] Trial structure: 7 floors, each with a fixed enemy set and a fixed dungeon modifier
- [ ] No loot drops during Trials — rewards given only on full 7-floor completion
- [ ] Each Trial has a **Par Score**: the expected damage total for a "well-built" character
  - Beat Par by 0–25%: Bronze reward (200 Rune Dust)
  - Beat Par by 25–75%: Silver reward (500 Rune Dust + Magic item)
  - Beat Par by 75–150%: Gold reward (1000 Rune Dust + Rare item)
  - Beat Par by 150%+: Diamond reward (2500 Rune Dust + Legendary item + cosmetic title)
- [ ] Trial results show: total damage, damage per tick, best single hit, elements used
- [ ] 10 preset Trials defined in `trials.json`; 2 new trials added each content patch

**Trial-Exclusive Cosmetics**
- [ ] Diamond completions unlock visual rune skin variants (colour shifts only, no stat changes):
  - Frost Arrow → *Obsidian Arrow* (black ice particle trail)
  - Fireball → *Solar Flare* (white-gold burst instead of orange)
  - Ground Slash → *Void Cleave* (purple/black slash animation)
- [ ] Cosmetic skins stored in `playerState.unlockedSkins[]`; applied per-skill in Build Screen

**Estimated time:** 2 weeks

---

## 7. Technical Architecture

### File Structure
/src
/data
skillRunes.json ← All skill rune definitions
linkRunes.json ← All link rune definitions
zodiacTree.json ← Node positions, connections, stat effects
affixPool.json ← All gear affix definitions by tier
monsters.json ← Enemy templates with stats + resistances
dungeons.json ← Room wave configs per Tier
challenges.json ← 30 challenge definitions
trials.json ← Trial floor configs
tierKeyModifiers.json ← All Tier Key modifier definitions
/systems
CombatEngine.js ← runCombat(player, enemies) → combatLog]
SkillResolver.js ← buildSkillFromSlot(slot) → resolvedSkill
StatusEngine.js ← apply/stack/tick/expire statuses per entity
StatsCalculator.js ← merges gear + zodiac + ascendancy → playerStats
LootGenerator.js ← generateItem(tier, slot) → item object
AudioManager.js ← Web Audio API wrapper
SaveManager.js ← encodeSave / decodeSave / exportSave / importSave
BuildEncoder.js ← encodeBuild / decodeBuild for sharing
/components
/screens
BuildScreen.jsx
InventoryScreen.jsx
ZodiacScreen.jsx
DungeonScreen.jsx
BattleScreen.jsx
CraftingScreen.jsx
SettingsScreen.jsx
/ui
BottomNav.jsx
Header.jsx
ItemTooltip.jsx
SkillSlot.jsx
RunePicker.jsx
TutorialTooltip.jsx
LevelUpPopup.jsx
BuildSummaryCard.jsx
/canvas
BattleCanvas.jsx ← Canvas 2D controller
SpriteRenderer.js
SkillAnimator.js
DamageNumbers.js
/context
PlayerContext.jsx ← Global state + reducer
/hooks
useCombat.js
useZodiac.js
useLoot.js

---

### State Shape

```js
playerState = {
  name: "Runebound",
  level: 1,
  xp: 0,
  runeDust: 50,
  ascendancy: null,              // "runebound" | "hexblade" | "stormbringer"
  tutorialComplete: false,
  dailyLastCompleted: null,      // ISO date string

  skills: [
    {
      id: "skill-slot-1",
      skillRune: null,           // skillRune object or null
      links: [null, null, null, null, null, null]
    },
    // ... slots 2–5
  ],

  gear: {
    weapon: null,
    helmet: null,
    chest: null,
    gloves: null,
    boots: null
  },

  bag: [],                       // array of item objects (max 20)

  zodiac: {
    points: 0,
    allocated: []                // array of node IDs
  },

  records: {
    highestTierCleared: 0,
    highestSingleHit: 0,
    fastestClear: Infinity,
    totalEnemiesSlain: 0,
    totalRuneDustSpent: 0,
    favouriteSkillRune: null
  },

  challenges: [],                // [{ id, progress, completed }]
  unlockedSkins: [],
  completedTiers: []             // array of tier numbers cleared at least once
}
```

---

### Reducer Actions
EQUIP_SKILL_RUNE → { slotIndex, skillRune }
UNEQUIP_SKILL_RUNE → { slotIndex }
EQUIP_LINK_RUNE → { slotIndex, socketIndex, linkRune }
UNEQUIP_LINK_RUNE → { slotIndex, socketIndex }
EQUIP_GEAR → { slot, item }
UNEQUIP_GEAR → { slot }
SALVAGE_ITEM → { itemId } → adds Rune Dust
ALLOCATE_ZODIAC_NODE → { nodeId } → validates path + deducts point
RESPEC_ZODIAC_NODE → { nodeId } → deducts 50 Rune Dust
ADD_XP → { amount } → triggers level-up if threshold crossed
LEVEL_UP → awards Zodiac Point, sets new XP threshold
SET_ASCENDANCY → { path } → permanent, one-time only
CRAFT_ITEM → { operation, itemId, ...args }
COMPLETE_DUNGEON → { tier, loot[], xp, runeDust }
PLAYER_DEATH → {}
LOAD_SAVE → { savedState } → replaces entire state
UPDATE_RECORD → { key, value }
UPDATE_CHALLENGE → { id, progress }

---

## 8. Balance Targets

| Metric | Target |
|---|---|
| Tier 1 clear time | ~15–20 ticks (7.5–10 seconds at 1×) |
| Tier 5 clear time | ~40–60 ticks (20–30 seconds at 1×) |
| Tier 10 clear time | ~80–100 ticks; requires optimised build |
| Tier 20 clear time | ~150–200 ticks; requires near-perfect gear + full Zodiac path |
| Time to Ascendancy (Level 15) | ~25–30 Tier 5 runs (~2–3 hours of play) |
| Time to first Legendary drop | ~15–20 Tier 6+ runs |
| Average crafting sessions per item | 3–5 (balanced to feel impactful but not mandatory) |
| Rune Dust earned per Tier 5 run | ~80–120 (plus salvage) |
| Respec cost as % of one run's Dust | ~40–60% (expensive enough to be a real decision) |

---

## 9. Out of Scope (v1)

The following are intentionally excluded from v1 to protect scope:

- Multiplayer of any kind
- Cloud saves / account system
- PvP or leaderboards
- Procedurally generated Keystones
- New Game+ / Prestige system
- Storyline / narrative content
- Voice acting
- Pixel art sprite sheets (geometric placeholders ship in v1)
- Controller support
- Localization (English only for v1)

---

## 10. Version History

| Version | Date | Summary |
|---|---|---|
| 0.1 | Initial | First draft — basic combat loop, 3 milestones |
| 0.2 | Revision | Auto-combat architecture confirmed; full system designs added |
| 0.3 | Current | Optimized milestones; rune unlock levels added; XP table; onboarding rewrite; Hall of Records; full tech architecture; balance targets |
