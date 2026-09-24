"use client";

import React, { ReactNode } from "react";
import { GlobalHeader } from "@/components/common/GlobalHeader";
import { FloatingDduGlass } from "@/components/common/FloatingDduGlass";
import { DESIGN_TOKENS } from "@/styles/designSystem";
import { cn } from "@/lib/utils";

interface FluidPageShellProps {
  children: ReactNode;
  activeBreadcrumb?: string;
  hideDdu?: boolean;
  wideContainer?: boolean;
  className?: string;
}

/**
 * FluidPageShell — Universal Master Layout Container
 * All pages (Home, Cockpit, Mission Control, Privacy, Observability) borrow
 * their layout structure, carbon fibre weave texture, and header navigation
 * directly from this component.
 */
export function FluidPageShell({
  children,
  activeBreadcrumb,
  hideDdu = true,
  wideContainer = false,
  className,
}: FluidPageShellProps) {
  return (
    <div className={cn(DESIGN_TOKENS.surfaces.pageBackground, className)}>
      {/* Dynamic Ambient Carbon Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Subtle Top Aerospace Glow */}
        <div
          className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 w-full h-[450px] bg-radial from-amber-500/[0.04] via-cyan-500/[0.02] to-transparent blur-3xl",
            wideContainer ? "max-w-[1920px]" : "max-w-[1560px]"
          )}
        />
        {/* Vignette Rim */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(6,7,9,0.75)_100%)]" />
      </div>

      {/* Global Navigation Header Dock */}
      <div
        className={cn(
          "relative z-40 w-full mx-auto px-4 sm:px-6 pt-3",
          wideContainer ? "max-w-[1920px]" : "max-w-[1560px]"
        )}
      >
        <GlobalHeader activeBreadcrumb={activeBreadcrumb} />
      </div>

      {/* Main Content Viewport */}
      <main
        className={cn(
          "relative z-10 mx-auto transition-all",
          wideContainer ? DESIGN_TOKENS.layout.containerWide : DESIGN_TOKENS.layout.container,
          wideContainer ? "py-4 sm:py-6" : "py-8 sm:py-12 md:py-16"
        )}
      >
        {children}
      </main>

      {/* Persistent Floating Digital Dash Unit (DDU) */}
      {!hideDdu && <FloatingDduGlass />}
    </div>
  );
}

/**
 * FluidSurface — Modular Carbon Fibre Composite Panel
 * Standardizes panels across all pages with genuine 3K carbon weave sheen.
 */
export function FluidSurface({
  children,
  className,
  variant = "card",
  glow = "none",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  variant?: "card" | "glass" | "forged" | "flush";
  glow?: "gold" | "cyan" | "purple" | "none";
  onClick?: () => void;
}) {
  const getVariantClass = () => {
    switch (variant) {
      case "glass":
        return DESIGN_TOKENS.surfaces.glass;
      case "forged":
        return "bg-carbon-forged border border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.85)]";
      case "flush":
        return "bg-transparent border-0";
      case "card":
      default:
        return DESIGN_TOKENS.surfaces.card;
    }
  };

  const getGlowClass = () => {
    switch (glow) {
      case "gold":
        return "hover:border-amber-400/50 hover:shadow-[0_0_25px_rgba(212,175,55,0.2)]";
      case "cyan":
        return "hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(0,245,212,0.2)]";
      case "purple":
        return "hover:border-purple-400/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]";
      case "none":
      default:
        return "";
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl p-4 sm:p-6 transition-all duration-300",
        getVariantClass(),
        getGlowClass(),
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * FluidSection — Standardized Section Scaffolding with Laser Dividers
 */
export function FluidSection({
  children,
  title,
  subtitle,
  badge,
  action,
  laserColor = "gold",
  centered = true,
  className,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  badge?: string;
  action?: ReactNode;
  laserColor?: "gold" | "cyan" | "purple" | "none";
  centered?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("relative my-12 sm:my-16 md:my-20", className)}>
      {/* Laser Dividing Beam */}
      {laserColor !== "none" && (
        <div
          className={cn(
            "w-full mb-10 max-w-[1560px] mx-auto",
            laserColor === "gold" && DESIGN_TOKENS.surfaces.laserGold,
            laserColor === "cyan" && DESIGN_TOKENS.surfaces.laserCyan,
            laserColor === "purple" && DESIGN_TOKENS.surfaces.laserPurple
          )}
        />
      )}

      {/* Symmetrical Section Header */}
      {(title || badge) && (
        <div
          className={cn(
            "flex flex-col gap-2 mb-8",
            centered ? "items-center text-center max-w-3xl mx-auto" : "items-start text-left"
          )}
        >
          {badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30 mb-1 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {badge}
            </span>
          )}
          {title && (
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tight uppercase text-white">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm font-mono text-neutral-400 tracking-wide leading-relaxed">
              {subtitle}
            </p>
          )}

          {action && <div className="mt-4">{action}</div>}
        </div>
      )}

      {/* Section Body */}
      {children}
    </section>
  );
}
