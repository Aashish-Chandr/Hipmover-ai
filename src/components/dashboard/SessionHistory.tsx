"use client";

import React, { useState, useEffect } from "react";
import { SingleRepMetrics, SessionMetricsSummary } from "@/lib/types";
import { Save, History, Trash2, ArrowRight } from "lucide-react";

interface SavedSessionRecord {
  id: string;
  timestamp: string;
  summary: SessionMetricsSummary;
  reps: SingleRepMetrics[];
}

interface SessionHistoryProps {
  currentSummary: SessionMetricsSummary | null;
  currentReps?: SingleRepMetrics[];
  onLoadSession?: (summary: SessionMetricsSummary, reps: SingleRepMetrics[]) => void;
}

const STORAGE_KEY = "hipermove_saved_sessions_v1";

export function SessionHistory({
  currentSummary,
  currentReps = [],
  onLoadSession,
}: SessionHistoryProps) {
  const [sessions, setSessions] = useState<SavedSessionRecord[]>([]);

  // Load saved sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSessions(JSON.parse(stored));
      }
    } catch {
      // Storage unavailable or invalid
    }
  }, []);

  const saveCurrentSession = () => {
    if (!currentSummary || currentReps.length === 0) return;

    const newRecord: SavedSessionRecord = {
      id: "sess_" + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      summary: currentSummary,
      reps: currentReps,
    };

    const updated = [newRecord, ...sessions.slice(0, 4)];
    setSessions(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage error
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="border border-hairline bg-ink-0 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-4 mb-4">
        <div>
          <p className="label-mono text-[10px] text-chrome-mid mb-0.5">LOCAL PERSISTENCE</p>
          <h4 className="text-[15px] font-semibold text-paper-0">
            Session History & Baseline Ledger
          </h4>
        </div>
        <button
          onClick={saveCurrentSession}
          disabled={!currentSummary || currentReps.length === 0}
          className="btn-jamie-secondary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Save Active Session</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="py-6 text-center text-paper-2 font-mono text-xs">
          No previous sessions logged in local client storage.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              onClick={() => onLoadSession?.(sess.summary, sess.reps)}
              className="border border-hairline bg-ink-1 p-3.5 hover:border-chrome-mid transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between label-mono text-[10px] text-paper-2 mb-2">
                  <span>{sess.timestamp}</span>
                  <button
                    onClick={(e) => deleteSession(sess.id, e)}
                    className="hover:text-red-400 p-0.5"
                    title="Delete session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-[14px] font-bold text-paper-0">
                  {sess.summary.totalReps} Reps · {sess.summary.avgQualityScore}/100
                </div>
                <div className="text-[11px] font-mono text-paper-2 mt-1">
                  Avg Depth: {Math.round(sess.summary.avgDepthAngle)}°
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-hairline flex items-center justify-between label-mono text-[10px] text-paper-1 group-hover:text-white">
                <span>LOAD SESSION</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
