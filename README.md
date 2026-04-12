# Game Design Document: Project RUNEFALL
### Auto-Combat Dungeon Crawler â€” Revised Edition

**Version:** 0.2 â€” Auto-Combat Revision  
**Stack:** Vite + React (UI & Logic) + Canvas 2D (Battle Animation Layer)  
**Platform:** Browser (Desktop + Mobile)  
**Genre:** Auto-Combat RPG / Dungeon Crawler  
**Tone:** Dark Fantasy â€” Rune-inscribed world where constellations grant power  
**Core Promise:** All depth is in *preparation*. Players win by building smart, not by playing fast.

---

## 1. Executive Summary

RUNEFALL is a browser-based Auto-Combat Dungeon Crawler. Players assemble a build using a classless **Rune Linking system**, navigate a constellation-shaped **Zodiac Passive Tree**, and equip procedurally generated gear â€” then send their Runebound hunter into dungeons and watch their preparation play out automatically.

There is no twitch skill required. Victory or defeat is determined entirely before combat begins. This creates a pure **theory-craft loop**: simulate â†’ observe â†’ adjust â†’ go deeper.

The core addictive loop:

> **Build â†’ Enter Dungeon â†’ Watch Combat â†’ Loot â†’ Upgrade Build â†’ Enter Harder Dungeon â†’ Repeat**

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

This is the most important design decision. Combat is a **deterministic tick simulation**, not a real-time physics engine.

### How It Works

Every **500ms**, the game engine runs one "combat tick":

```
TICK LOOP (runs every 500ms via setInterval):
  1. Player skills fire based on cooldown timers
  2. Skill damage calculated: baseDamage Ã— runeModifiers Ã— zodiacBonuses Ã— gearStats
  3. Status effects applied to enemies (Burn, Chill, Shock, Bleed, Poison)
  4. Enemy attacks fire based on their attack speed
  5. Player takes damage (mitigated by gear defense + Zodiac bonuses)
  6. Status effects tick damage on both sides
  7. Check win/lose condition (all enemies dead OR player HP = 0)
  8. Emit combat event log entry â†’ React state â†’ renders in Battle Log UI
```

No collision detection. No pathfinding. No pixel positions. Combat is **pure math**, resolved as a formula, displayed as a log.

### What the Player Sees

A **battle animation panel** (Canvas 2D) shows:
- Animated player sprite on the left
- Enemy sprite(s) on the right
- Skill effect animations flying between them (purely cosmetic)
- HP bars depleting in real time
- Floating damage numbers

The animation is cosmetic â€” it plays back the combat log events as a visual story. The actual outcome was already computed when the player clicked "Enter Dungeon."

### Why This Is Powerful

- Combat balance is entirely about **number tuning** (spreadsheet work), not physics debugging
- Deterministic outcomes mean players can **predict** their build's performance
- The same system runs on mobile with zero performance issues

---

## 4. Core Gameplay Systems

### 4.1 Skill Rune System

Each of the player's 5 skill slots holds a **Skill Rune** with up to 6 **Link Rune** sockets.

**Skill Runes** define the base attack pattern:

| Rune | Base Type | Base Behavior |
|---|---|---|
| Frost Arrow | Ranged / Ice | Fires projectile each tick; applies Chill |
| Fireball | Spell / Fire | AoE burst damage; applies Burn |
| Ground Slash | Melee / Physical | High single-target damage; applies Bleed |
| Chain Lightning | Spell / Lightning | Hits 3 enemies; applies Shock |
| Bone Spear | Ranged / Physical | High damage; pierces through enemies |
| Poison Nova | Spell / Poison | AoE around player; stacking Poison |
| Shadow Step | Melee / Physical | Double-damage burst; resets cooldown on kill |
| Frozen Orb | Spell / Ice | Persistent AoE zone; slow tick damage |

**Link Runes** are modifier objects that mutate the Skill Rune at calculation time:

| Link | Effect |
|---|---|
| Fork | Skill hits 2 targets instead of 1 |
| AoE Expand | Increases hit count in AoE skills by +2 targets |
| Multicast | Skill fires twice per tick; 60% damage each |
| More Damage | +45% flat damage multiplier |
| Ignite Support | Adds Burn application to any skill |
| Chill Support | Adds Chill application to any skill |
| Echo | 30% chance to cast skill a second time for free |
| Totem | Skill spawns a stationary totem that fires independently |
| Trigger: On Kill | Linked skill auto-casts when an enemy dies |
| Mana Leech | Restores mana equal to 3% of damage dealt |
| Culling Strike | Instantly kills enemies below 15% HP |
| Penetration | Ignores 25% of enemy elemental resistance |

**Example Build â€” "Blizzard Overlord":**
```
Skill Slot 1: [Frost Arrow] â†’ [Multicast] â†’ [AoE Expand] â†’ [Chill Support]
Skill Slot 2: [Frozen Orb] â†’ [More Damage] â†’ [Penetration]
Skill Slot 3: [Chain Lightning] â†’ [Echo] â†’ [Trigger: On Kill â†’ Fireball]
```

### 4.2 Zodiac Passive Tree

A constellation-shaped SVG node graph. Players earn **Zodiac Points** on level-up and spend them to traverse the tree.

**Structure:**
- 12 constellations, each with a distinct stat theme
- Each constellation: 8â€“12 minor nodes + 1 Major Keystone at the center
- Minor nodes: small incremental bonuses (+5% Fire Damage, +20 Max HP, +3% Attack Speed)
- Keystones: build-defining modifiers that change *how* your skills behave

**12 Constellations:**

| # | Name | Theme | Keystone |
|---|---|---|---|
| 1 | Ember | Fire damage | *Conflagration* â€” Burn stacks deal 200% increased damage |
| 2 | Glacier | Ice / Freeze | *Shatter* â€” Frozen enemies explode, dealing AoE damage |
| 3 | Tempest | Lightning | *Overcharge* â€” Shock increases all damage taken by 40% |
| 4 | Crimson | Bleed / Physical | *Hemorrhage* â€” Bleed stacks deal burst damage on skill cast |
| 5 | Plague | Poison | *Pandemic* â€” Poison spreads to nearby enemies on kill |
| 6 | Bastion | Defense / HP | *Iron Will* â€” 20% of damage taken is converted to mana |
| 7 | Venom | Chaos damage | *Wither* â€” Enemies lose 2% max HP per second per Chaos stack |
| 8 | Gale | Speed / Cooldown | *Windstep* â€” Skills with cooldown under 1s fire twice per tick |
| 9 | Void | Mana / Spell | *Blood Mage* â€” Skills cost HP instead of mana; gain damage equal to HP spent |
| 10 | Iron | Melee | *Blademaster* â€” Melee skills have no mana cost; +50% melee damage |
| 11 | Wisp | Summon / Totem | *Necromancer's Mark* â€” On-kill Trigger Links also summon a shadow minion |
| 12 | Omen | Luck / Crit | *Fortune's Edge* â€” Critical strikes guaranteed every 5th hit; +200% crit damage |

### 4.3 Gear & Loot System

Five gear slots: **Weapon, Helmet, Chest, Gloves, Boots.**

**Gear Tiers:**

| Tier | Color | Affixes | Drop Chance |
|---|---|---|---|
| Normal | White | 0 | 60% |
| Magic | Blue | 1â€“2 random | 28% |
| Rare | Yellow | 3â€“5 random | 10% |
| Legendary | Orange | 1 unique fixed + 2 random | 2% |

**Affix Pool (examples):**
- +% increased [element] damage
- +flat Max HP / Max Mana
- +% attack speed (reduces skill cooldown)
- +% cooldown reduction
- +% critical strike chance / multiplier
- Adds Xâ€“Y elemental damage to skills
- +% skill rune effect magnitude
- +% increased item rarity (more Rare drops)
- Regenerate X HP per second

**Gear Score:** Each item has a numeric Gear Score (sum of affix values). The UI shows the delta when hovering a new item over an equipped one, making upgrade decisions instant.

### 4.4 Status Effects & Elemental System

| Status | Element | Effect | Interaction |
|---|---|---|---|
| Burn | Fire | Tick damage over 4s | Burn + Bleed = Hemorrhage (burst on expiry) |
| Chill | Ice | -30% enemy attack speed | Chill Ã— 3 stacks = Freeze (skip 2 turns) |
| Shock | Lightning | +20% damage taken | Shock + Freeze = Shatter (AoE explosion) |
| Bleed | Physical | Tick damage based on max HP | Bleed + Poison = Sepsis (double tick rate) |
| Poison | Poison | Stacking tick damage | Poison + Burn = Plague (spreads on kill) |

### 4.5 Dungeon & Zone System

Dungeons are structured as **Chaos Tiers** (Tier 1â€“30+).

Each dungeon run:
1. Player selects a Tier
2. Dungeon generates 3 rooms: **2 combat rooms + 1 boss room**
3. Each combat room has a wave of monsters (count scales with Tier)
4. Boss room has a single elite enemy with 3 special mechanics
5. On clear: loot chest drops based on Tier, Tier Key to unlock next Tier

**Dungeon Modifiers** (random, shown before entering):
- "Monsters have 60% increased HP"
- "All monsters apply Shock on hit"
- "+200% item quantity, monsters explode on death"
- "Elite monsters appear in combat rooms"

Higher-modifier dungeons always drop more and better loot.

### 4.6 Economy & Crafting

**Rune Dust** â€” primary currency, salvaged from unwanted gear.

| Action | Cost | Outcome |
|---|---|---|
| Reroll one affix on Rare gear | 50 Dust | Random new affix from pool |
| Add affix to Magic gear | 30 Dust | Upgrades Magic â†’ Rare |
| Corrupt item | 100 Dust | Random: powerful implicit OR lose all affixes |
| Legendary recipe | 3Ã— same-slot Rares | Chance to craft a Legendary |
| Upgrade Rune tier | 200 Dust | Rune level +1 (increases base damage) |

---

## 5. UI Layout

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  HEADER: Player Name | Level | EXP Bar | Gold | Rune Dust    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚               â”‚                      â”‚                       â”‚
â”‚  LEFT PANEL   â”‚   BATTLE PANEL       â”‚   RIGHT PANEL         â”‚
â”‚               â”‚   (Canvas 2D)        â”‚                       â”‚
â”‚  â€¢ Skill Rune â”‚                      â”‚  â€¢ Enemy Info         â”‚
â”‚    slots 1â€“5  â”‚  [Player] âš”ï¸ [Enemy] â”‚  â€¢ Enemy HP bars      â”‚
â”‚  â€¢ Link configâ”‚                      â”‚  â€¢ Status effects     â”‚
â”‚    per skill  â”‚  Floating damage     â”‚  â€¢ Dungeon Modifiers  â”‚
â”‚               â”‚  HP bars             â”‚                       â”‚
â”‚               â”‚  Skill animations    â”‚                       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  COMBAT LOG: Frost Arrow â†’ 342 dmg | Burn applied | Enemy B died â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  BOTTOM NAV: [Build] [Inventory] [Zodiac] [Dungeon] [Craft]  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Screens (React components):**
- **Build Screen** â€” Rune slot manager, link configuration, active skill preview
- **Inventory Screen** â€” 5 gear slots, item bag, tooltip comparison, salvage button
- **Zodiac Screen** â€” SVG node graph, point counter, respec button
- **Dungeon Screen** â€” Tier map, modifier preview, Enter button
- **Crafting Bench** â€” Currency inputs, item slot, outcome preview
- **Battle Screen** â€” Canvas animation panel + combat log + post-battle loot

---

## 6. Development Milestones

---

### ðŸŸ¢ MILESTONE 1 â€” Combat Simulation Engine
**Goal:** Combat resolves correctly as a tick simulation. No visuals yet â€” just logic.

**Deliverables:**
- [ ] `CombatEngine.js` â€” pure function: `runCombat(player, enemies) â†’ combatLog[]`
- [ ] `combatTick()` â€” calculates one round: player skills fire, enemy attacks fire, statuses tick
- [ ] `playerStats` object: HP, mana, attackSpeed, skills[]
- [ ] `Enemy` template: `{ name, hp, armor, attackDamage, attackSpeed, resistances }`
- [ ] Hardcode 3 enemies and 1 skill to test the loop
- [ ] Console-log the full combat log (no UI yet)
- [ ] Win/lose detection with log entry
- [ ] Unit test: same inputs always produce same outputs (deterministic)

**Tech:** Pure JS module â€” no React, no Canvas yet  
**Estimated time:** 3â€“5 days

---

### ðŸŸ¢ MILESTONE 2 â€” Skill Rune Data System
**Goal:** Skills and links are data objects. Linking runes changes damage output.

**Deliverables:**
- [ ] `skillRunes.json` â€” 8 skill runes with base stats
- [ ] `linkRunes.json` â€” 12 link runes with modifier functions
- [ ] `SkillResolver.js` â€” takes `(skillRune, links[])` â†’ returns resolved damage profile
- [ ] Link modifier functions implemented as pure transforms: `(skill) => ({ ...skill, damage: skill.damage * 1.45 })`
- [ ] Mana cost calculation: base cost Ã— each link's cost multiplier
- [ ] Cooldown calculation: base cooldown Ã· attack speed stat
- [ ] `buildSkillFromSlot(slot)` â†’ fully resolved skill ready for CombatEngine

**Tech:** Data files in `/src/data/`, resolver in `/src/systems/`  
**Estimated time:** 4â€“6 days

---

### ðŸŸ¢ MILESTONE 3 â€” React UI Shell + Build Screen
**Goal:** Player can equip runes and see their resolved skill stats in a UI.

**Deliverables:**
- [ ] Vite + React project scaffolded
- [ ] Bottom navigation bar: Build / Inventory / Zodiac / Dungeon / Craft
- [ ] **Build Screen**: 5 skill slots, click slot â†’ open rune picker modal
- [ ] Rune picker: lists all owned skill runes, select to equip
- [ ] Link slot UI per skill: shows 1â€“6 sockets, click socket â†’ link rune picker
- [ ] Live stat preview panel: shows resolved damage, mana cost, cooldown for each skill
- [ ] Player stats panel: HP, mana, attack speed, total Gear Score
- [ ] Global `playerState` context (React Context API)

**Tech:** React + Vite, CSS Modules or Tailwind  
**Estimated time:** 1 week

---

### ðŸŸ¢ MILESTONE 4 â€” Loot System + Inventory Screen
**Goal:** Items are generated with random affixes. Player equips gear and stats update.

**Deliverables:**
- [ ] `affixPool.json` â€” 20+ affixes with min/max ranges and stat keys
- [ ] `generateItem(tier, slot)` â€” creates randomized item object
- [ ] `ItemTooltip` React component â€” shows all affixes, Gear Score, and delta vs. equipped
- [ ] **Inventory Screen**: 5 gear slots (equipped) + 20-slot bag
- [ ] Equip/unequip items; `playerStats` recalculates immediately
- [ ] Salvage button: removes item â†’ adds Rune Dust to currency
- [ ] "Drop test" button (dev mode): generates random loot for testing
- [ ] Item rarity color coding (White / Blue / Yellow / Orange)

**Tech:** React state + context  
**Estimated time:** 1 week

---

### ðŸŸ¡ MILESTONE 5 â€” Dungeon Screen + First Playable Loop
**Goal:** The complete game loop works end-to-end. Build â†’ Enter â†’ Fight â†’ Loot.

**Deliverables:**
- [ ] **Dungeon Screen**: Tier 1â€“5 selector, modifier preview panel, Enter button
- [ ] Dungeon generates 3 rooms (wave config from JSON)
- [ ] Clicking Enter runs `CombatEngine` with current `playerStats` vs. room enemies
- [ ] **Battle Screen**: displays combat log line by line with 300ms delay between entries (readable replay)
- [ ] Simple Canvas panel: player sprite left, enemy sprite right, HP bars, floating numbers
- [ ] Post-battle loot screen: shows dropped items, click to pick up or salvage
- [ ] Tier Key drop on dungeon clear â†’ unlocks next Tier
- [ ] Player death screen with stats and retry button
- [ ] XP awarded on clear â†’ feeds level system (next milestone)

**Tech:** Canvas 2D for battle animation; React for all surrounding UI  
**Estimated time:** 10â€“14 days

---

### ðŸŸ¡ MILESTONE 6 â€” Level System + Zodiac Tree
**Goal:** Players level up, earn Zodiac Points, and navigate a visual passive node graph.

**Deliverables:**
- [ ] XP curve formula: `xpRequired(level) = 100 Ã— level^1.5`
- [ ] Level-up popup with animation; awards 1 Zodiac Point per level
- [ ] `zodiacTree.json` â€” define 3 full constellations (30 nodes + 3 Keystones)
- [ ] **Zodiac Screen**: SVG-rendered node graph; nodes connected by lines
- [ ] Click to allocate node (validates path requirements, deducts point)
- [ ] Allocated nodes glow; locked nodes are dim
- [ ] Keystone nodes: larger icons with unique visual treatment
- [ ] `zodiacBonuses` computed from all allocated nodes â†’ merged into `playerStats`
- [ ] Respec cost: 50 Rune Dust per unallocated node

**Tech:** SVG node graph in React; position data stored in JSON  
**Estimated time:** 2 weeks

---

### ðŸŸ¡ MILESTONE 7 â€” Status Effects + Elemental Interactions
**Goal:** Status effects change combat meaningfully. Element combos create satisfying power spikes.

**Deliverables:**
- [ ] `StatusEngine.js` â€” manages active statuses per entity: apply, stack, tick, expire
- [ ] All 5 statuses implemented: Burn, Chill/Freeze, Shock, Bleed, Poison
- [ ] Freeze mechanic: enemy skips 1 tick (shown in combat log as "FROZEN â€” skipped turn")
- [ ] Interaction matrix: 5 element combos trigger bonus effects
- [ ] Combat log shows interactions: `"Shock + Freeze â†’ SHATTER for 892 damage!"`
- [ ] Monster resistances in template JSON: some enemies immune to certain elements
- [ ] Resist-piercing mechanic via Penetration link rune

**Estimated time:** 1 week

---

### ðŸŸ¡ MILESTONE 8 â€” Crafting Bench + Economy
**Goal:** Players can improve gear without pure RNG dependency.

**Deliverables:**
- [ ] **Crafting Bench Screen**: drag item into slot, select operation, preview outcome
- [ ] Reroll affix: removes one random affix, adds new random from pool
- [ ] Augment: adds one affix to a Magic item (max 2 affixes â†’ becomes Rare)
- [ ] Corrupt: random outcome table (5 possible outcomes including bad ones)
- [ ] Legendary recipe: combine 3 same-slot Rares (25% chance Legendary, 75% returns Magic)
- [ ] Rune Upgrade: spend Dust to increase a skill rune's tier (+10% base damage per tier, max tier 5)
- [ ] Currency display updated after every transaction

**Estimated time:** 1 week

---

### ðŸŸ  MILESTONE 9 â€” Build Depth & All Systems Expanded
**Goal:** Builds feel truly distinct. A Fire build plays completely differently from a Bleed build.

**Deliverables:**
- [ ] Expand to 12 Skill Runes (all 5 elements + physical + chaos + summon)
- [ ] Expand to 20 Link Runes (include all Trigger links)
- [ ] Trigger Links fully implemented: `On Kill`, `On Hit`, `On Low HP`, `On Full Mana`
- [ ] All 12 Zodiac constellations defined and rendered in the tree (120 minor + 12 Keystones)
- [ ] All 12 Keystones implemented in `CombatEngine.js`
- [ ] Legendary items: design 10 unique Legendary effects (e.g., "Fireball leaves a burning ground zone")
- [ ] **Offline Build Planner**: simulate combat against a test dummy without entering a dungeon
- [ ] Build import/export: serialize build to a shareable URL string

**Estimated time:** 4â€“5 weeks

---

### ðŸŸ  MILESTONE 10 â€” Dungeon Depth & Monster Variety
**Goal:** High-tier dungeons feel genuinely dangerous and mechanically distinct.

**Deliverables:**
- [ ] Expand to 20 Chaos Tiers (Tiers 1â€“10 tutorial curve, 11â€“20 endgame)
- [ ] 15 monster templates: 3 archetypes Ã— 5 element variants (Fire Golem, Ice Golem, etc.)
- [ ] Elite monsters: appear in Tier 8+, have 1 special mechanic (shield phase, summon adds, enrage)
- [ ] Boss designs: one unique boss per 5 tiers with 2-phase fight logic
- [ ] Full dungeon modifier pool: 20 modifiers balanced for fun, not frustration
- [ ] Monster scaling formula: `m
