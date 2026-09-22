"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Gauge,
  Sparkles,
  Activity,
  Car,
  Flag,
  User,
  Sliders,
  FileText,
  Zap,
  ArrowRight,
  X,
  Keyboard,
  Gamepad2,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefs } from "@/lib/cockpit/preferences";
import { useUxStore } from "@/store/uxStore";

export interface CommandItem {
  id: string;
  category: "NAVIGATION" | "DDU DISPLAY" | "CIRCUITS" | "DRIVERS" | "ACTIONS";
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDduMode?: (mode: "RACE" | "QUALY" | "TYRES" | "CHASSIS") => void;
}

export function CommandPalette({ isOpen, onClose, onSelectDduMode }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { setMotion, setDensity, motion, density } = usePrefs();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery("");
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const items: CommandItem[] = useMemo(() => {
    return [
      // Navigation
      {
        id: "nav-cockpit",
        category: "NAVIGATION",
        title: "Cockpit HUD",
        subtitle: "Real-time high frequency driving cockpit & instrument cluster",
        shortcut: "⇧ 1",
        icon: <Gauge size={14} className="text-gold" />,
        action: () => {
          router.push("/dashboard");
          onClose();
        },
      },
      {
        id: "nav-mission",
        category: "NAVIGATION",
        title: "Mission Control",
        subtitle: "Multi-channel telemetry delta analyzer, setup matrix & AI debrief",
        shortcut: "⇧ 2",
        icon: <Sparkles size={14} className="text-gold" />,
        action: () => {
          router.push("/dashboard/intelligence");
          onClose();
        },
      },
      {
        id: "nav-debug",
        category: "NAVIGATION",
        title: "System Observability",
        subtitle: "UDP packet stream statistics, latency monitors & system health",
        shortcut: "⇧ 3",
        icon: <Activity size={14} className="text-gold" />,
        action: () => {
          router.push("/debug");
          onClose();
        },
      },

      // DDU Modes
      {
        id: "ddu-race",
        category: "DDU DISPLAY",
        title: "DDU: Race Mode",
        subtitle: "Speed, high-contrast gear cluster, delta bar, ERS battery & fuel",
        shortcut: "1",
        icon: <Car size={14} className="text-amber-400" />,
        action: () => {
          onSelectDduMode?.("RACE");
          onClose();
        },
      },
      {
        id: "ddu-qualy",
        category: "DDU DISPLAY",
        title: "DDU: Qualifying Mode",
        subtitle: "Sector micro-splits, shift cue rev-band, DRS gate status",
        shortcut: "2",
        icon: <Car size={14} className="text-amber-400" />,
        action: () => {
          onSelectDduMode?.("QUALY");
          onClose();
        },
      },
      {
        id: "ddu-tyres",
        category: "DDU DISPLAY",
        title: "DDU: Tyres & Thermal Mode",
        subtitle: "4-corner PSI pressures, carcass temperatures & brake fluid",
        shortcut: "3",
        icon: <Car size={14} className="text-amber-400" />,
        action: () => {
          onSelectDduMode?.("TYRES");
          onClose();
        },
      },
      {
        id: "ddu-chassis",
        category: "DDU DISPLAY",
        title: "DDU: Chassis & Aero Mode",
        subtitle: "Suspension damper travel (mm), wheel slip ratio & G-load circle",
        shortcut: "4",
        icon: <Car size={14} className="text-amber-400" />,
        action: () => {
          onSelectDduMode?.("CHASSIS");
          onClose();
        },
      },

      // Circuits
      {
        id: "trk-monaco",
        category: "CIRCUITS",
        title: "Circuit de Monaco (Monte Carlo)",
        subtitle: "3.337 km · 19 Corners · High downforce street circuit",
        shortcut: "GP",
        icon: <Flag size={14} className="text-cyan-400" />,
        action: () => {
          router.push("/dashboard/intelligence");
          onClose();
        },
      },
      {
        id: "trk-silverstone",
        category: "CIRCUITS",
        title: "Silverstone Grand Prix Circuit",
        subtitle: "5.891 km · 18 Corners · High-speed flowing sweepers (Maggotts/Becketts)",
        shortcut: "GP",
        icon: <Flag size={14} className="text-cyan-400" />,
        action: () => {
          router.push("/dashboard/intelligence");
          onClose();
        },
      },
      {
        id: "trk-spa",
        category: "CIRCUITS",
        title: "Circuit de Spa-Francorchamps",
        subtitle: "7.004 km · 19 Corners · Eau Rouge / Raidillon & Blanchimont",
        shortcut: "GP",
        icon: <Flag size={14} className="text-cyan-400" />,
        action: () => {
          router.push("/dashboard/intelligence");
          onClose();
        },
      },

      // Drivers
      {
        id: "drv-ver",
        category: "DRIVERS",
        title: "Max Verstappen (VER)",
        subtitle: "Red Bull Racing · FastF1 Telemetry Reference Benchmark",
        shortcut: "#1",
        icon: <User size={14} className="text-blue-400" />,
        action: () => {
          router.push("/dashboard/intelligence");
          onClose();
        },
      },
      {
        id: "drv-ham",
        category: "DRIVERS",
        title: "Lewis Hamilton (HAM)",
        subtitle: "Mercedes-AMG Petronas · FastF1 Telemetry Reference Benchmark",
        shortcut: "#44",
        icon: <User size={14} className="text-emerald-400" />,
        action: () => {
          router.push("/dashboard/intelligence");
          onClose();
        },
      },
      {
        id: "drv-lec",
        category: "DRIVERS",
        title: "Charles Leclerc (LEC)",
        subtitle: "Scuderia Ferrari · FastF1 Telemetry Reference Benchmark",
        shortcut: "#16",
        icon: <User size={14} className="text-red-400" />,
        action: () => {
          router.push("/dashboard/intelligence");
          onClose();
        },
      },

      // Actions
      {
        id: "act-motion",
        category: "ACTIONS",
        title: "Cycle UI Motion Profile",
        subtitle: `Current: ${motion.toUpperCase()} (Full 60Hz -> Reduced -> Off)`,
        shortcut: "M",
        icon: <Zap size={14} className="text-amber-400" />,
        action: () => {
          const next = motion === "full" ? "reduced" : motion === "reduced" ? "off" : "full";
          setMotion(next);
          onClose();
        },
      },
      {
        id: "act-density",
        category: "ACTIONS",
        title: "Toggle UI Density",
        subtitle: `Current: ${density.toUpperCase()} (Comfortable <-> Compact)`,
        shortcut: "D",
        icon: <Sliders size={14} className="text-amber-400" />,
        action: () => {
          setDensity(density === "comfortable" ? "compact" : "comfortable");
          onClose();
        },
      },
      {
        id: "act-connect",
        category: "ACTIONS",
        title: "Connect EA Sports F1 Game (UDP 20777)",
        subtitle: "Setup 60Hz UDP telemetry bridge for PC, PlayStation, or Xbox",
        shortcut: "C",
        icon: <Gamepad2 size={14} className="text-gold" />,
        action: () => {
          useUxStore.getState().openConnectModal();
          onClose();
        },
      },
      {
        id: "act-guide",
        category: "ACTIONS",
        title: "Open Platform Guide & Architecture",
        subtitle: "Interactive workstation manual, telemetry physics & keyboard hotkeys",
        shortcut: "?",
        icon: <HelpCircle size={14} className="text-gold" />,
        action: () => {
          useUxStore.getState().openGuideModal();
          onClose();
        },
      },
      {
        id: "act-debrief",
        category: "ACTIONS",
        title: "Generate AI Engineering Debrief",
        subtitle: "Run FastF1 cubic alignment, corner delta detector & coaching synthesis",
        shortcut: "↵",
        icon: <FileText size={14} className="text-emerald-400" />,
        action: () => {
          router.push("/dashboard/intelligence");
          onClose();
        },
      },
    ];
  }, [router, onClose, onSelectDduMode, motion, density, setMotion, setDensity]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Handle keyboard navigation inside command palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[14vh] px-4">
      {/* Backdrop Scrim */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#0B0C10] border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.08),0_0_30px_rgba(207,163,73,0.12)] overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[70vh]">
        
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.1] bg-[#101117]">
          <Search size={16} className="text-gold shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search commands, Grand Prix circuits, reference drivers, or DDU modes..."
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 font-mono outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
              <span>ESC</span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-white/[0.03]">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
              <Keyboard size={24} className="text-neutral-600" />
              <p className="text-xs font-mono text-neutral-400">No matching commands found for &quot;{query}&quot;</p>
              <span className="text-[10px] text-neutral-500">Try searching &quot;Monaco&quot;, &quot;Verstappen&quot;, &quot;Qualy&quot;, or &quot;Debrief&quot;</span>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all my-0.5",
                    isSelected
                      ? "bg-gradient-to-r from-gold/20 via-gold/10 to-transparent border border-gold/40 shadow-[0_0_15px_rgba(207,163,73,0.15)]"
                      : "hover:bg-white/[0.04] border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "p-2 rounded-lg shrink-0 transition-colors",
                        isSelected ? "bg-gold/25 text-gold" : "bg-white/[0.04] text-neutral-400"
                      )}
                    >
                      {item.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-mono font-bold tracking-tight truncate",
                            isSelected ? "text-gold" : "text-neutral-200"
                          )}
                        >
                          {item.title}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-neutral-400 uppercase tracking-wider shrink-0">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <span className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.shortcut && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-white/10 text-neutral-300 font-bold">
                        {item.shortcut}
                      </span>
                    )}
                    <ArrowRight
                      size={12}
                      className={cn(
                        "transition-transform",
                        isSelected ? "text-gold translate-x-0.5" : "text-neutral-600"
                      )}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-t border-white/[0.06] text-[10px] font-mono text-neutral-500">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to close</span>
          </div>
          <div className="flex items-center gap-1.5 text-gold">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            <span className="font-bold">APX-IQ WORKSTATION</span>
          </div>
        </div>

      </div>
    </div>
  );
}
