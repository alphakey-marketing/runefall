# Runefall

A web-based RPG featuring combat mechanics, skill/rune management, inventory systems, and dungeon exploration.

## Tech Stack

- **Frontend:** React 18 + Vite 5
- **Language:** JavaScript (ESM) with JSX
- **Styling:** Plain CSS (modularized per component/screen)
- **State Management:** React Context API

## Project Structure

```
src/
  canvas/       - Canvas rendering (BattleRenderer)
  components/   - Reusable UI (BottomNav, CombatLog, ItemTooltip, RunePicker)
  context/      - Global state (GameContext, PlayerContext)
  data/         - JSON game data (monsters, runes, affixes, dungeon tiers)
  engine/       - Core game logic (CombatEngine, LootSystem, SkillResolver, ZodiacSystem)
  screens/      - Main views (BattleScreen, BuildScreen, DungeonScreen, InventoryScreen)
  utils/        - Helpers (FormulaHelpers, StatsCalculator)
  App.jsx       - Main shell and screen router
  main.jsx      - Entry point with Providers
```

## Development

```bash
npm install
npm run dev      # starts dev server on port 5000
npm run build    # production build to dist/
```

## Deployment

Configured as a **static** deployment:
- Build command: `npm run build`
- Public directory: `dist`
