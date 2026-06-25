# APX IQ Component Architecture

**Status:** ✅ Modular architecture complete (Phases 1-4)  
**Next:** Dashboard revamp implementation

---

## Architecture Overview

```
ui/src/
├── lib/theme/              # 🎨 Design System (Single Source of Truth)
│   ├── colors.ts           # Color palette + tyre temp functions
│   ├── constants.ts        # Spacing, sizing, thresholds
│   ├── variants.ts         # Component variant configs
│   └── index.ts
│
├── components/f1/          # 🏎️ F1-Specific Components
│   ├── primitives/         # Building blocks
│   │   ├── Panel.tsx       # Base container with carbon aesthetic
│   │   ├── MetricValue.tsx # Animated stat display
│   │   ├── BarGauge.tsx    # Horizontal/vertical gauges
│   │   ├── Badge.tsx       # Status indicators
│   │   └── index.ts
│   │
│   ├── charts/             # Real-time visualizations
│   │   ├── SpeedChart.tsx
│   │   ├── ThrottleBrakeChart.tsx
│   │   ├── RPMGauge.tsx
│   │   ├── TyreTempsDisplay.tsx
│   │   └── index.ts
│   │
│   ├── metrics/            # Analytics displays
│   │   ├── MetricCard.tsx
│   │   ├── LapTimingPanel.tsx
│   │   ├── FuelPanel.tsx
│   │   └── index.ts
│   │
│   ├── layout/             # Page structure
│   │   ├── DashboardHeader.tsx
│   │   ├── DashboardFooter.tsx
│   │   └── index.ts
│   │
│   ├── index.ts            # Central export
│   └── Primitives.tsx      # 🗑️ LEGACY - will be removed
│
└── hooks/
    ├── useTelemetry.ts     # Enhanced with derived metrics
    └── useSocket.ts
```

---

## Design System

### Theme Files (`lib/theme/`)

**`colors.ts`** - Single source for all colors
- Base colors (black, carbon, gold, silver)
- Status colors (success, danger, warning)
- Chart colors (speed, rpm, throttle, brake)
- Tyre temp colors + helper functions
- Status color class generators

**`constants.ts`** - Design tokens
- Spacing scale
- Typography scale
- Z-index layers
- Animation durations & easing
- Telemetry rates
- Metric thresholds (fuel, rpm, tyre temps)

**`variants.ts`** - Component variant configs
- Metric size/color variants
- Badge variants
- Panel variants
- Gauge color variants
- Sector status colors

---

## Component Categories

### 1. **Primitives** (`components/f1/primitives/`)
Foundational building blocks used across all components.

| Component | Purpose | Props |
|-----------|---------|-------|
| `Panel` | Carbon fiber container with title | `title`, `variant`, `headerRight` |
| `MetricValue` | Animated single stat | `label`, `value`, `unit`, `size`, `color` |
| `BarGauge` | Animated progress bar | `value`, `max`, `color`, `vertical`, `showValue` |
| `Badge` | Status chip | `variant`, `pulse` |

### 2. **Charts** (`components/f1/charts/`)
Real-time telemetry visualizations using Recharts.

| Component | Purpose | Data Source |
|-----------|---------|-------------|
| `SpeedChart` | Speed trace with avg/max lines | `history`, `derived.avgSpeed`, `derived.maxSpeed` |
| `ThrottleBrakeChart` | F1-style overlapping traces | `history` (throttle/brake) |
| `RPMGauge` | Horizontal RPM bar with redline | `telemetry.rpm`, `carStatus.maxRPM` |
| `TyreTempsDisplay` | 4-tyre color-coded visual | `telemetry.tyreTemps` |

### 3. **Metrics** (`components/f1/metrics/`)
Analytics and stat display components.

| Component | Purpose | Data Source |
|-----------|---------|-------------|
| `MetricCard` | Compact stat card for grids | Any single metric |
| `LapTimingPanel` | Current lap, sectors, last lap, position | `lapData` |
| `FuelPanel` | Fuel remaining, burn rate, laps left | `carStatus`, `derived.fuelBurnRate` |

### 4. **Layout** (`components/f1/layout/`)
Page structure components.

| Component | Purpose | Props |
|-----------|---------|-------|
| `DashboardHeader` | Top bar with logo, session info, nav | `isConnected`, `session`, `lapData`, `gameVersion` |
| `DashboardFooter` | Live analytics stats | `derived`, `isConnected` |

---

## Enhanced Telemetry Hook

### `useTelemetry()` - Now includes derived metrics

**Returns:**
```typescript
{
  // Raw telemetry
  telemetry: TelemetryData | null;
  lapData: LapData | null;
  carStatus: CarStatusData | null;
  session: SessionData | null;
  isConnected: boolean;
  
  // NEW: History buffer
  history: HistoryPoint[];  // Last 300 points (~5s at 60Hz)
  
  // NEW: Derived analytics
  derived: {
    avgSpeed: number;         // Rolling average
    maxSpeed: number;         // Session max
    brakeBias: number;        // % time braking
    throttleBias: number;     // % time full throttle
    coasting: number;         // % time coasting
    fuelBurnRate: number;     // kg/lap
    rpmPercent: number;       // % of maxRPM
    lapProgress: number;      // % of current lap
    tyreStress: number;       // Avg temp deviation
    gForceProxy: number;      // Lateral load estimate
  };
}
```

---

## Usage Examples

### Simple Metric Card
```tsx
import { MetricCard } from '@/components/f1';

<MetricCard 
  label="AVG SPEED" 
  value={derived.avgSpeed} 
  unit="km/h" 
  color="gold" 
/>
```

### Speed Chart with Panel
```tsx
import { Panel, SpeedChart } from '@/components/f1';

<Panel title="SPEED TRACE">
  <SpeedChart 
    history={history}
    avgSpeed={derived.avgSpeed}
    maxSpeed={derived.maxSpeed}
  />
</Panel>
```

### Dashboard Layout
```tsx
import { DashboardHeader, DashboardFooter } from '@/components/f1';

<div className="h-screen flex flex-col">
  <DashboardHeader 
    isConnected={isConnected}
    session={session}
    lapData={lapData}
  />
  
  {/* Main content */}
  
  <DashboardFooter 
    derived={derived}
    isConnected={isConnected}
  />
</div>
```

---

## Benefits Achieved

✅ **Modularity**
- Each component is self-contained
- Easy to test in isolation
- Can swap/reuse across pages

✅ **Single Source of Truth**
- All colors defined in one place
- Consistent design tokens
- Theme changes cascade automatically

✅ **Maintainability**
- Clear component hierarchy
- Easy to locate specific features
- Small, focused files (<200 lines)

✅ **Scalability**
- Add new charts without touching dashboard
- Create variants using theme system
- Intelligence page reuses same components

✅ **Type Safety**
- All props typed with TypeScript
- Theme values type-checked
- Import errors caught at compile time

---

## Next Steps: Dashboard Revamp

With this foundation in place, the dashboard revamp will:
1. Import modular components
2. Arrange in 3-column grid layout
3. Connect to enhanced telemetry hook
4. Show derived metrics everywhere

**Dashboard page will be ~150 lines** (just layout + data wiring)
vs current **~500 lines** (everything inline).

See implementation plan in main conversation thread.
