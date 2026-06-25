# Dashboard Revamp Implementation Plan

**Prerequisites:** ✅ Modular architecture complete  
**Status:** 🟡 Ready to implement  
**Estimated Time:** 30-45 minutes

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER: Logo | Session: RACE • Track: MONZA • Lap: 5/25 | [Intel] [●] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ ┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│ │  SPEED TRACE        │  │  SPEED METRICS  │  │  LAP TIMING         │  │
│ │  [Live graph with   │  │  ┌────┬────┬───┐│  │  Current: 1:34.567  │  │
│ │   avg/max lines]    │  │  │AVG │MAX │CUR││  │  S1: 28.4  S2: 35.6 │  │
│ │                     │  │  │245 │312 │267││  │  Last: 1:33.245     │  │
│ │                     │  │  └────┴────┴───┘│  │  Δ: +2.3s  P3       │  │
│ └─────────────────────┘  └─────────────────┘  └─────────────────────┘  │
│                                                                           │
│ ┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│ │  THROTTLE vs BRAKE  │  │  RPM GAUGE      │  │  FUEL MANAGEMENT    │  │
│ │  [Overlapping dual  │  │  ████████░░ 85% │  │  24.5kg (11.7 laps) │  │
│ │   trace chart]      │  │  12,750 / 15,000│  │  Burn: 2.1 kg/lap   │  │
│ │                     │  │  GEAR: 7        │  │  ██████████░░ 47%   │  │
│ └─────────────────────┘  └─────────────────┘  └─────────────────────┘  │
│                                                                           │
│ ┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│ │  TYRE TEMPS         │  │  PEDAL INPUTS   │  │  GEARBOX           │  │
│ │  FL   FR   RL   RR  │  │  THR │││BRK │││ │  │        7            │  │
│ │  [█]  [█]  [█]  [█] │  │  98% │││ 0%    │  │                     │  │
│ │  95°  98°  92°  94° │  │                 │  │                     │  │
│ └─────────────────────┘  └─────────────────┘  └─────────────────────┘  │
│                                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ ANALYTICS: AVG 245 | MAX 312 | BRAKE 52% | THROTTLE 67% | STRESS 8°C  │
│ SESSION: Uptime 12:45 | Signal LIVE 60Hz | Coasting 15%                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Grid Structure

### 3-Column Responsive Grid
```
grid-cols-12
grid-rows-[auto_1fr_auto]  // Header, content, footer

Content area:
grid-cols-3
grid-rows-3
gap-3
```

### Column Breakdown
- **Left (Col 1):** Large charts (Speed, Throttle/Brake, Tyres)
- **Center (Col 2):** Compact metrics (Speed stats, RPM, Pedals)
- **Right (Col 3):** Timing & Fuel (Lap timing, Fuel, Gear)

---

## Component Mapping

### Row 1
| Position | Component | Data |
|----------|-----------|------|
| Left | `<Panel title="SPEED TRACE"><SpeedChart /></Panel>` | `history`, `derived.avgSpeed`, `derived.maxSpeed` |
| Center | `<Panel title="SPEED METRICS"><MetricCard /> x3</Panel>` | `derived.avgSpeed`, `derived.maxSpeed`, `telemetry.speed` |
| Right | `<Panel title="LAP TIMING"><LapTimingPanel /></Panel>` | `lapData`, `session.totalLaps` |

### Row 2
| Position | Component | Data |
|----------|-----------|------|
| Left | `<Panel title="THROTTLE vs BRAKE"><ThrottleBrakeChart /></Panel>` | `history` |
| Center | `<Panel title="ENGINE"><RPMGauge /></Panel>` | `telemetry.rpm`, `carStatus.maxRPM`, `telemetry.gear` |
| Right | `<Panel title="FUEL"><FuelPanel /></Panel>` | `carStatus`, `derived.fuelBurnRate` |

### Row 3
| Position | Component | Data |
|----------|-----------|------|
| Left | `<Panel title="TYRE TEMPS"><TyreTempsDisplay /></Panel>` | `telemetry.tyreTemps` |
| Center | `<Panel title="PEDAL INPUTS"><BarGauge /> x2</Panel>` | `telemetry.throttle`, `telemetry.brake` |
| Right | `<Panel title="GEARBOX"><MetricValue /></Panel>` | `telemetry.gear` |

---

## Implementation Steps

### 1. Update Import Statements
Replace old imports with new modular ones:
```tsx
// ❌ OLD
import { CarbonPanel, MetricValue, BarGauge } from '@/components/f1/Primitives';

// ✅ NEW
import {
  Panel,
  MetricValue,
  BarGauge,
  SpeedChart,
  ThrottleBrakeChart,
  RPMGauge,
  TyreTempsDisplay,
  MetricCard,
  LapTimingPanel,
  FuelPanel,
  DashboardHeader,
  DashboardFooter,
} from '@/components/f1';
```

### 2. Replace Header Section
```tsx
<DashboardHeader
  isConnected={isConnected}
  session={session}
  lapData={lapData}
  gameVersion={gameVersion}
/>
```

### 3. Build Content Grid
```tsx
<div className="grid grid-cols-3 grid-rows-3 gap-3 flex-1">
  {/* Row 1: Speed chart, metrics, timing */}
  <Panel title="SPEED TRACE" className="relative">
    <div className="flex-1 flex items-center justify-center z-20">
      <MetricValue
        label=""
        value={Math.round(telemetry?.speed ?? 0)}
        unit="KM/H"
        size="2xl"
        color="gold"
      />
    </div>
    <div className="absolute inset-0 top-8 opacity-40">
      <SpeedChart
        history={history}
        avgSpeed={derived.avgSpeed}
        maxSpeed={derived.maxSpeed}
      />
    </div>
  </Panel>

  {/* ... continue for all 9 panels ... */}
</div>
```

### 4. Replace Footer
```tsx
<DashboardFooter derived={derived} isConnected={isConnected} />
```

### 5. Remove Inline Components
Delete:
- `LiveGraph` component
- `getTyreColor` function (now in theme)
- `StartSequence` (keep if needed, or make separate component)

---

## Files to Modify

1. ✏️ `ui/src/app/dashboard/page.tsx` - Main dashboard (major refactor)
2. ✏️ `ui/src/app/dashboard/intelligence/page.tsx` - Update to use new primitives
3. ✅ `ui/src/hooks/useTelemetry.ts` - Already updated with derived metrics

---

## Expected Outcomes

### Before
- Dashboard: **~500 lines**, everything inline
- Intelligence: **~800 lines**, duplicated patterns
- No shared components

### After
- Dashboard: **~150 lines**, just layout + wiring
- Intelligence: **~400 lines**, reuses components
- **20+ reusable components** in `components/f1/`

### Metrics
- **70% code reduction** in page components
- **100% design consistency** (single theme source)
- **10x faster** to add new features
- **Fully typed** with TypeScript

---

## Testing Checklist

After implementation:

- [ ] Dashboard loads without errors
- [ ] All telemetry data displays correctly
- [ ] Derived metrics calculate properly
- [ ] Charts animate smoothly at 60Hz
- [ ] Tyre temps color-code correctly
- [ ] RPM gauge shows redline warning
- [ ] Fuel panel shows low fuel alert
- [ ] Footer stats update in real-time
- [ ] Header shows connection status
- [ ] Intelligence button navigates correctly

---

## Ready to Proceed?

All prerequisites are complete. The modular architecture is in place.

**Next command:** Update `ui/src/app/dashboard/page.tsx` with new layout.

This will be a complete rewrite of the dashboard using our new component library.
