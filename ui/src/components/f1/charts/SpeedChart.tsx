/**
 * SpeedChart — LightweightCharts canvas-based real-time speed trace
 * Canvas rendering means zero React reconciliation at 60 Hz
 */

"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LineData,
} from "lightweight-charts";
import { apxColors } from "@/lib/theme";
import type { HistoryPoint } from "@/hooks/useTelemetry";

interface SpeedChartProps {
  history:  HistoryPoint[];
  avgSpeed: number;
  maxSpeed: number;
}

export function SpeedChart({ history, avgSpeed, maxSpeed }: SpeedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<"Line"> | null>(null);
  const avgLineRef   = useRef<ISeriesApi<"Line"> | null>(null);
  const maxLineRef   = useRef<ISeriesApi<"Line"> | null>(null);

  // ── Initialize chart once ───────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor:  apxColors.silver,
      },
      grid: {
        vertLines:  { color: "rgba(255,255,255,0.04)" },
        horzLines:  { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { visible: false },
      leftPriceScale:  { visible: false },
      timeScale: {
        visible:            false,
        borderColor:        "transparent",
        fixLeftEdge:        true,
        fixRightEdge:       true,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll:   false,
      handleScale:    false,
      crosshair: {
        vertLine: { visible: false },
        horzLine: { labelVisible: false, color: "rgba(255,255,255,0.2)" },
      },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // Main speed series
    const speedSeries = chart.addLineSeries({
      color:       apxColors.chartSpeed,
      lineWidth:   2,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Avg line
    const avgSeries = chart.addLineSeries({
      color:      apxColors.silver + "80",
      lineWidth:  1,
      lineStyle:  LineStyle.Dashed,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Max line
    const maxSeries = chart.addLineSeries({
      color:      apxColors.alert + "90",
      lineWidth:  1,
      lineStyle:  LineStyle.Dotted,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current   = chart;
    seriesRef.current  = speedSeries;
    avgLineRef.current = avgSeries;
    maxLineRef.current = maxSeries;

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

  // ── Update data on every history change ───────────────────────────────────
  useEffect(() => {
    if (!seriesRef.current || !history.length) return;

    // LightweightCharts needs time as unix seconds (unique, increasing)
    const data: LineData[] = history.map((p, i) => ({
      time:  (p.t / 1000 + i * 0.001) as any,
      value: p.speed,
    }));
    seriesRef.current.setData(data);

    // Avg reference line across full width
    if (avgLineRef.current && avgSpeed > 0) {
      const avgData: LineData[] = [
        { time: data[0].time, value: avgSpeed },
        { time: data[data.length - 1].time, value: avgSpeed },
      ];
      avgLineRef.current.setData(avgData);
    }

    // Max reference line
    if (maxLineRef.current && maxSpeed > 0) {
      const maxData: LineData[] = [
        { time: data[0].time, value: maxSpeed },
        { time: data[data.length - 1].time, value: maxSpeed },
      ];
      maxLineRef.current.setData(maxData);
    }

    chartRef.current?.timeScale().fitContent();
  }, [history, avgSpeed, maxSpeed]);

  return <div ref={containerRef} className="w-full h-full" />;
}
