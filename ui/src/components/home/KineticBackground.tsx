"use client";

import React, { useEffect, useRef } from "react";

export function KineticBackground({ scrollProgress = 0 }: { scrollProgress?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(scrollProgress);

  useEffect(() => {
    scrollRef.current = scrollProgress;
  }, [scrollProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    // Star / Warp Particles
    const starCount = 120;
    const stars = Array.from({ length: starCount }).map(() => ({
      x: (Math.random() - 0.5) * 3000,
      y: (Math.random() - 0.5) * 2000,
      z: Math.random() * 2000,
      size: Math.random() * 2 + 0.5,
    }));

    let time = 0;

    const render = () => {
      time += 0.015;
      const progress = scrollRef.current; // 0 to 1

      // Always synchronize canvas buffer dimensions to full window dimensions
      const width = (canvas.width = window.innerWidth || document.documentElement.clientWidth || 1920);
      const height = (canvas.height = window.innerHeight || document.documentElement.clientHeight || 1080);
      const centerX = width / 2;
      const centerY = height / 2;

      // ── COLOR GRADIENT SHIFT BASED ON SCROLL ──
      let accentR = 245, accentG = 158, accentB = 11; // Amber Gold

      if (progress < 0.33) {
        // Gold to Cyan transition
        const t = progress / 0.33;
        accentR = Math.round(245 + (6 - 245) * t);
        accentG = Math.round(158 + (182 - 158) * t);
        accentB = Math.round(11 + (212 - 11) * t);
      } else if (progress < 0.66) {
        // Cyan to Purple transition
        const t = (progress - 0.33) / 0.33;
        accentR = Math.round(6 + (168 - 6) * t);
        accentG = Math.round(182 + (85 - 182) * t);
        accentB = Math.round(212 + (247 - 212) * t);
      } else {
        // Purple to Emerald transition
        const t = (progress - 0.66) / 0.34;
        accentR = Math.round(168 + (16 - 168) * t);
        accentG = Math.round(85 + (185 - 85) * t);
        accentB = Math.round(247 + (129 - 247) * t);
      }

      // Base symmetrical radial background fill
      const grad = ctx.createRadialGradient(
        centerX,
        height * (0.35 + progress * 0.3),
        50,
        centerX,
        centerY,
        width * 0.75
      );
      grad.addColorStop(0, `rgba(${accentR}, ${accentG}, ${accentB}, ${0.08 + Math.sin(time) * 0.02})`);
      grad.addColorStop(0.55, "rgba(10, 12, 16, 0.96)");
      grad.addColorStop(1, "#07080a");

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // ── 1. PERSPECTIVE GRID (PERFECTLY CENTERED) ──
      ctx.save();
      const horizonY = height * (0.55 - progress * 0.15);
      const gridPitch = 32 + progress * 32;
      ctx.strokeStyle = `rgba(${accentR}, ${accentG}, ${accentB}, ${0.05 + progress * 0.04})`;
      ctx.lineWidth = 1;

      // Perspective vanishing lines converging symmetrically at centerX
      for (let x = -width; x <= width * 2; x += 120) {
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(centerX, horizonY);
        ctx.stroke();
      }

      // Horizontal ground plane lines
      for (let y = horizonY; y <= height; y += gridPitch) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // ── 2. HIGH SPEED WARP STREAM PARTICLES ──
      const speed = 4 + progress * 14;
      ctx.save();
      ctx.fillStyle = `rgb(${accentR}, ${accentG}, ${accentB})`;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.z -= speed;
        if (s.z <= 0) {
          s.z = width;
          s.x = (Math.random() - 0.5) * width * 2;
          s.y = (Math.random() - 0.5) * height * 2;
        }

        const k = 280 / s.z;
        const px = s.x * k + centerX;
        const py = s.y * k + centerY;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const pSize = Math.max(0.5, (1 - s.z / width) * s.size * (1 + progress));
          const alpha = (1 - s.z / width) * 0.7;

          // Velocity light trail
          ctx.strokeStyle = `rgba(${accentR}, ${accentG}, ${accentB}, ${alpha})`;
          ctx.lineWidth = pSize;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - (s.x * k * 0.06 * (1 + progress * 2)), py - (s.y * k * 0.06 * (1 + progress * 2)));
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // ── 3. SCANLINE CRT TEXTURE ──
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
