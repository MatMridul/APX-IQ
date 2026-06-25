/**
 * ThrottleBrakeChart — F1-style throttle vs brake overlay
 * Two filled area series on one canvas — no React re-renders at 60 Hz
 */

"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type AreaData,
} from "lightweight-charts";
import { apxColors } from "@/lib/theme";
import type { HistoryPoint } from "@/hooks/useTelemetry";

interface ThrottleBrakeChartProps {
  history: HistoryPoint[];
}

export function ThrottleBrakeChart({ history }: ThrottleBrakeChartProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const chartRef       = useRef<IChartApi | null>(null);
  const throttleRef    = useRef<ISeriesApi<"Area"> | null>(null);
  const brakeRef       = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor:  apxColors.silver,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: { visible: false },
      leftPriceScale:  { visible: false },
      timeScale: {
        visible:      false,
        borderColor:  "transparent",
        fixLeftEdge:  true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale:  false,
      crosshair: {
        vertLine: { visible: false },
        horzLine: { labelVisible: false, color: "rgba(255,255,255,0.2)" },
      },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // Throttle — green area
    const throttleSeries = chart.addAreaSeries({
      lineColor:    apxColors.chartThrottle,
      topColor:     apxColors.chartThrottle + "40",
      bottomColor:  apxColors.chartThrottle + "00",
      lineWidth:    2,
      crosshairMarkerVisible: false,
      priceLineVisible:       false,
      lastValueVisible:       false,
    });

    // Brake — red area, rendered on top
    const brakeSeries = chart.addAreaSeries({
      lineColor:    apxColors.chartBrake,
      topColor:     apxColors.chartBrake + "50",
      bottomColor:  apxColors.chartBrake + "00",
      lineWidth:    2,
      crosshairMarkerVisible: false,
      priceLineVisible:       false,
      lastValueVisible:       false,
    });

    chartRef.current    = chart;
    throttleRef.current = throttleSeries;
    brakeRef.current    = brakeSeries;

    const resizeObs = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    resizeObs.observe(containerRef.current);

    return () => {
      resizeObs.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!throttleRef.current || !brakeRef.current || !history.length) return;

    const throttleData: AreaData[] = history.map((p, i) => ({
      time:  (p.t / 1000 + i * 0.001) as any,
      value: p.throttle,
    }));

    const brakeData: AreaData[] = history.map((p, i) => ({
      time:  (p.t / 1000 + i * 0.001) as any,
      value: p.brake,
    }));

    throttleRef.current.setData(throttleData);
    brakeRef.current.setData(brakeData);
    chartRef.current?.timeScale().fitContent();
  }, [history]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute top-1 right-2 flex items-center gap-3 pointer-events-none">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-green-500" />
          <span className="text-[9px] font-bold text-green-500">THROTTLE</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500" />
          <span className="text-[9px] font-bold text-red-500">BRAKE</span>
        </div>
      </div>
    </div>
  );
}
