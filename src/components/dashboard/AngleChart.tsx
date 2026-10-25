"use client";

import React, { useMemo } from "react";
import { SingleRepMetrics } from "@/lib/types";

interface AngleChartProps {
  reps: SingleRepMetrics[];
  currentAngle?: number | null;
}

export function AngleChart({ reps, currentAngle }: AngleChartProps) {
  // Synthesize or interpolate points from rep metrics for the biomechanics curve
  const chartData = useMemo(() => {
    if (!reps || reps.length === 0) {
      // Default baseline idle curve
      return [
        { time: 0, angle: 170, phase: "STANDING" },
        { time: 1.0, angle: 168, phase: "STANDING" },
        { time: 2.0, angle: 165, phase: "STANDING" },
      ];
    }

    const points: { time: number; angle: number; phase: string; rep?: number; isBottom?: boolean }[] = [];
    points.push({ time: 0, angle: 168, phase: "STANDING" });

    reps.forEach((rep) => {
      const tStart = rep.startTimeSec;
      const tBottom = rep.bottomTimeSec;
      const tEnd = rep.endTimeSec;

      // Start of descent
      points.push({ time: Number((tStart).toFixed(2)), angle: 165, phase: "STANDING" });
      // Mid descent
      const midDescentT = (tStart + tBottom) / 2;
      points.push({
        time: Number(midDescentT.toFixed(2)),
        angle: Number(((165 + rep.minKneeAngle) / 2).toFixed(1)),
        phase: "DESCENDING",
      });
      // Bottom inflection point
      points.push({
        time: Number(tBottom.toFixed(2)),
        angle: rep.minKneeAngle,
        phase: "BOTTOM",
        rep: rep.repNumber,
        isBottom: true,
      });
      // Mid ascent
      const midAscentT = (tBottom + tEnd) / 2;
      points.push({
        time: Number(midAscentT.toFixed(2)),
        angle: Number(((rep.minKneeAngle + 165) / 2).toFixed(1)),
        phase: "ASCENDING",
      });
      // End standing
      points.push({ time: Number(tEnd.toFixed(2)), angle: 166, phase: "STANDING" });
    });

    return points;
  }, [reps]);

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 220;
  const padX = 50;
  const padY = 30;

  const minAngle = 60;
  const maxAngle = 180;
  const maxTime = Math.max(chartData[chartData.length - 1]?.time || 5, 5);

  const getX = (t: number) => padX + (t / maxTime) * (svgWidth - padX * 2);
  const getY = (deg: number) => padY + ((maxAngle - deg) / (maxAngle - minAngle)) * (svgHeight - padY * 2);

  // Generate SVG path string with cubic bezier curves
  const pathD = useMemo(() => {
    if (chartData.length < 2) return "";
    let d = `M ${getX(chartData[0].time)} ${getY(chartData[0].angle)}`;
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const x0 = getX(prev.time);
      const y0 = getY(prev.angle);
      const x1 = getX(curr.time);
      const y1 = getY(curr.angle);
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  }, [chartData, maxTime]);

  // Gradient area path string
  const areaD = useMemo(() => {
    if (!pathD) return "";
    const firstX = getX(chartData[0].time);
    const lastX = getX(chartData[chartData.length - 1].time);
    const bottomY = svgHeight - padY;
    return `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pathD, chartData, maxTime]);

  return (
    <div className="border border-hairline bg-ink-0 p-6 md:p-8">
      {/* Header bar */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-4 mb-4">
        <div>
          <p className="label-mono text-[10px] text-chrome-mid mb-1">TELEMETRY STREAM</p>
          <h4 className="text-[15px] font-semibold text-paper-0">
            Knee Flexion Curve & Rep Inflection Telemetry
          </h4>
        </div>
        <div className="flex items-center gap-4 label-mono text-[11px]">
          <span className="flex items-center gap-1.5 text-paper-2">
            <span className="h-2 w-2 rounded-full bg-[#00D2D3]" />
            <span>Inflection Keyframe</span>
          </span>
          <span className="flex items-center gap-1.5 text-paper-2">
            <span className="h-0.5 w-3 bg-white/40 border-b border-dashed" />
            <span>Target &lt;100°</span>
          </span>
          {currentAngle !== null && currentAngle !== undefined && (
            <span className="text-[#00D2D3] border border-hairline px-2 py-0.5 bg-ink-1">
              LIVE: {Math.round(currentAngle)}°
            </span>
          )}
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[500px] h-auto overflow-visible"
        >
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D2D3" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00D2D3" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#AEB4BD" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#00D2D3" />
            </linearGradient>
          </defs>

          {/* Grid Guideline: 160° Standing */}
          <line
            x1={padX}
            y1={getY(160)}
            x2={svgWidth - padX}
            y2={getY(160)}
            stroke="rgba(244, 245, 247, 0.08)"
            strokeDasharray="4 4"
          />
          <text
            x={padX - 8}
            y={getY(160) + 3}
            fill="#7E8590"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            160°
          </text>

          {/* Grid Guideline: 100° Parallel Squat Target */}
          <line
            x1={padX}
            y1={getY(100)}
            x2={svgWidth - padX}
            y2={getY(100)}
            stroke="rgba(0, 210, 211, 0.25)"
            strokeDasharray="4 4"
          />
          <text
            x={padX - 8}
            y={getY(100) + 3}
            fill="#00D2D3"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            100°
          </text>

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#curveGradient)" />}

          {/* Spline curve */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#strokeGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Inflection Points & Rep Markers */}
          {chartData
            .filter((p) => p.isBottom)
            .map((pt, idx) => (
              <g key={idx}>
                {/* Vertical drop marker line */}
                <line
                  x1={getX(pt.time)}
                  y1={getY(pt.angle)}
                  x2={getX(pt.time)}
                  y2={svgHeight - padY}
                  stroke="rgba(0, 210, 211, 0.3)"
                  strokeDasharray="2 2"
                />
                {/* Glowing ring */}
                <circle
                  cx={getX(pt.time)}
                  cy={getY(pt.angle)}
                  r="7"
                  fill="rgba(0, 210, 211, 0.2)"
                />
                <circle
                  cx={getX(pt.time)}
                  cy={getY(pt.angle)}
                  r="3.5"
                  fill="#00D2D3"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                {/* Rep Bottom label */}
                <text
                  x={getX(pt.time)}
                  y={getY(pt.angle) - 12}
                  fill="#F4F5F7"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Rep {pt.rep} · {Math.round(pt.angle)}°
                </text>
              </g>
            ))}

          {/* Bottom X-axis line */}
          <line
            x1={padX}
            y1={svgHeight - padY}
            x2={svgWidth - padX}
            y2={svgHeight - padY}
            stroke="rgba(244, 245, 247, 0.12)"
          />
          <text
            x={svgWidth - padX}
            y={svgHeight - padY + 16}
            fill="#7E8590"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            TIME (SEC) →
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-paper-2 label-mono pt-3 border-t border-hairline">
        <span>INSPECTOR: 60 FPS IN-BROWSER KINEMATIC INTEGRATION</span>
        <span>HYSTERESIS ENGINE: &gt;160° STANDING ⇄ &lt;100° BOTTOM</span>
      </div>
    </div>
  );
}
