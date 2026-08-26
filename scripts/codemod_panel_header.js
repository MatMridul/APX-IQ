/**
 * Codemod: adopt PanelHeader (gold-tick headings) in cockpit instruments
 * and consolidate SIM badges to the status bar (audit T2-10).
 * Idempotent.
 */
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "ui", "src", "components", "cockpit");
const FILES = [
  "TrackMap.tsx",
  "TelemetryRibbon.tsx",
  "BattlePanel.tsx",
  "InsightFeed.tsx",
  "RaceCarTelemetry.tsx",
  "BottomInstruments.tsx",
];

for (const name of FILES) {
  const p = path.join(DIR, name);
  let src = fs.readFileSync(p, "utf8");
  const before = src;

  // 1. Header blocks: <div justify-between ...><MicroLabel>X</MicroLabel><SimBadge/></div>
  //    → <PanelHeader label="X" />
  src = src.replace(
    /<div className="flex items-center justify-between[^"]*">\s*<MicroLabel>([^<]+)<\/MicroLabel>\s*(<SimBadge[^/]*\/>)?\s*<\/div>/g,
    (_m, label) => `<PanelHeader label="${label.trim()}" />`
  );

  // 2. Standalone SimBadge removal (any remaining in these files)
  src = src.replace(/\s*<SimBadge[^/]*\/>/g, "");

  // 3. Drop SimBadge from the primitives import if now unused
  if (!src.includes("<SimBadge")) {
    src = src.replace(
      /import \{([^}]*)\bSimBadge\b,?\s*([^}]*)\} from "\.\/primitives";/g,
      (_m, a, b) => {
        const keep = `${a}${b}`.replace(/^[,\s]+|[,\s]+$/g, "").replace(/,\s*,/g, ",");
        return `import { ${keep} } from "./primitives";`;
      }
    );
  }

  // 4. Ensure PanelHeader import
  if (src.includes("PanelHeader") && !src.includes('from "./PanelHeader"')) {
    const lines = src.split("\n");
    let lastImport = 0;
    lines.forEach((l, i) => {
      if (/^import /.test(l)) lastImport = i;
    });
    lines.splice(lastImport + 1, 0, 'import { PanelHeader } from "./PanelHeader";');
    src = lines.join("\n");
  }

  if (src !== before) {
    fs.writeFileSync(p, src);
    console.log("[mod]", name);
  } else {
    console.log("[skip]", name);
  }
}
