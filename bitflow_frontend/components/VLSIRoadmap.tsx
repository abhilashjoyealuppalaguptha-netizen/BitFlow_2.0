"use client";

import React, { useState } from "react";
import Link from "next/link";
import { VLSI_ROADMAP_STAGES, VLSIRole, RoadmapStage } from "@/lib/roadmap-data";

export default function VLSIRoadmap() {
  const [selectedRole, setSelectedRole] = useState<VLSIRole | null>(null);
  const [checkedTopics, setCheckedTopics] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const toggleTopic = (topic: string) => {
    setCheckedTopics((prev) => ({ ...prev, [topic]: !prev[topic] }));
  };

  const filteredStages = VLSI_ROADMAP_STAGES.map((stage) => {
    if (activeCategory === "all") return stage;
    const filteredRoles = stage.roles.filter(
      (r) => r.category === activeCategory || (activeCategory === "frontend" && stage.stepNumber === 1)
    );
    return { ...stage, roles: filteredRoles };
  }).filter((stage) => stage.roles.length > 0);

  return (
    <div className="space-y-10">
      {/* ── Category Filter Bar ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-rim/50 bg-pit/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-ghost uppercase tracking-wider">
            Filter Track:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "🗺️ Full VLSI Chip Pipeline" },
              { id: "frontend", label: "💻 Front-End (RTL & DV)" },
              { id: "midend", label: "🔬 Implementation & DFT" },
              { id: "backend", label: "🏗️ Physical Design & Layout" },
              { id: "validation", label: "⚡ Post-Silicon Validation" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`font-mono text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                  activeCategory === cat.id
                    ? "bg-phosphor/15 border-phosphor/50 text-phosphor font-bold shadow-[0_0_12px_rgba(0,232,122,0.2)]"
                    : "bg-surface/30 border-rim/40 text-dim hover:text-bright hover:border-rim"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="font-mono text-[10px] text-dim flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-phosphor animate-pulse" />
          <span>Click any role card to view detailed skill blueprint</span>
        </div>
      </div>

      {/* ── Visual Flowchart Diagram (roadmap.sh style) ───────────────────── */}
      <div className="relative space-y-12">
        {/* Vertical Connecting Axis Line */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-phosphor via-info to-danger opacity-30 hidden md:block" />

        {filteredStages.map((stage: RoadmapStage) => (
          <div key={stage.id} className="relative pl-0 md:pl-16 space-y-4">
            {/* Node Icon on Vertical Line */}
            <div
              className="absolute left-3.5 top-1.5 -translate-x-1/2 w-6 h-6 rounded-full border-2 bg-void flex items-center justify-center font-mono text-[10px] font-bold hidden md:flex z-10"
              style={{ borderColor: stage.accentColor, color: stage.accentColor }}
            >
              {stage.stepNumber}
            </div>

            {/* Stage Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded border"
                  style={{
                    color: stage.accentColor,
                    borderColor: `${stage.accentColor}40`,
                    backgroundColor: `${stage.accentColor}10`,
                  }}
                >
                  {stage.title}
                </span>
              </div>
              <p className="font-mono text-[11px] text-ghost/80">{stage.subtitle}</p>
            </div>

            {/* Role Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stage.roles.map((role: VLSIRole) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`group relative cursor-pointer p-5 rounded-xl border transition-all duration-200 backdrop-blur-md flex flex-col justify-between ${
                      isSelected
                        ? "border-phosphor bg-pit/90 shadow-[0_0_25px_rgba(0,232,122,0.25)] scale-[1.02]"
                        : "border-rim/60 bg-pit/40 hover:bg-pit/70 hover:border-rim hover:shadow-lg hover:-translate-y-1"
                    }`}
                  >
                    <div>
                      {/* Header Badge & Icon */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="text-2xl p-2 rounded-lg bg-surface/50 border border-rim/30">
                          {role.icon}
                        </span>
                        <span
                          className={`font-mono text-[8px] px-2 py-0.5 rounded-full border uppercase tracking-wider ${role.badgeBg} ${role.badgeText}`}
                        >
                          {role.entryBarrier}
                        </span>
                      </div>

                      {/* Title & Tagline */}
                      <h3 className="font-display text-[15px] font-bold text-bright group-hover:text-phosphor transition-colors mb-1">
                        {role.title}
                      </h3>
                      <p className="font-mono text-[10px] text-ghost/90 leading-relaxed mb-4">
                        {role.tagline}
                      </p>

                      {/* Required Languages preview */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {role.languages.slice(0, 3).map((lang, i) => (
                          <span
                            key={i}
                            className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-surface/60 border border-rim/40 text-dim"
                          >
                            {lang}
                          </span>
                        ))}
                        {role.languages.length > 3 && (
                          <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-surface/40 text-dim">
                            +{role.languages.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Inspector Button */}
                    <div className="pt-3 border-t border-rim/30 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-dim group-hover:text-bright transition-colors">
                        View Skill Roadmap
                      </span>
                      <span className="text-phosphor transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Slide-Out Role Inspector Drawer ─────────────────────────────────── */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 flex justify-end bg-void/80 backdrop-blur-sm animate-fade_in">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedRole(null)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-2xl bg-surface border-l border-rim/80 h-full overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl z-10 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Top Header */}
              <div className="flex items-start justify-between border-b border-rim/50 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-3 rounded-xl bg-pit border border-rim/50">
                    {selectedRole.icon}
                  </span>
                  <div>
                    <span className="font-mono text-[9px] text-phosphor uppercase tracking-wider">
                      {selectedRole.categoryLabel}
                    </span>
                    <h2 className="font-display text-[20px] font-bold text-bright">
                      {selectedRole.title}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="font-mono text-[12px] text-dim hover:text-bright px-3 py-1.5 rounded border border-rim/40 hover:bg-pit/60"
                >
                  ✕ Close
                </button>
              </div>

              {/* Tagline & Overview */}
              <div className="space-y-2">
                <h4 className="font-mono text-[10px] text-dim uppercase tracking-wider">
                  Role Overview
                </h4>
                <p className="font-mono text-[11px] text-ghost leading-relaxed bg-pit/40 p-4 rounded-xl border border-rim/40">
                  {selectedRole.description}
                </p>
              </div>

              {/* Core Theory & Academic Concepts (Interactive Checkboxes) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono text-[10px] text-phosphor uppercase tracking-wider font-semibold">
                    🧠 Core Academic Theory to Master
                  </h4>
                  <span className="font-mono text-[9px] text-dim">
                    Check off as you learn
                  </span>
                </div>
                <div className="space-y-2 bg-pit/30 p-4 rounded-xl border border-rim/40">
                  {selectedRole.coreTheory.map((theory, idx) => {
                    const isChecked = checkedTopics[theory] ?? false;
                    return (
                      <label
                        key={idx}
                        className="flex items-start gap-3 cursor-pointer group p-1.5 rounded hover:bg-surface/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTopic(theory)}
                          className="mt-0.5 accent-phosphor w-3.5 h-3.5 cursor-pointer"
                        />
                        <span
                          className={`font-mono text-[11px] leading-snug transition-colors ${
                            isChecked
                              ? "line-through text-dim"
                              : "text-bright group-hover:text-phosphor"
                          }`}
                        >
                          {theory}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Languages & Industry Standard Tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-rim/40 bg-pit/30 space-y-2">
                  <h4 className="font-mono text-[10px] text-info uppercase tracking-wider font-semibold">
                    💻 Code & Scripting
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRole.languages.map((lang, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[10px] px-2.5 py-1 rounded bg-info/10 border border-info/30 text-info font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-rim/40 bg-pit/30 space-y-2">
                  <h4 className="font-mono text-[10px] text-warn uppercase tracking-wider font-semibold">
                    🛠️ Industry EDA Tools
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRole.tools.map((tool, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[10px] px-2.5 py-1 rounded bg-warn/10 border border-warn/30 text-warn font-medium"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommended BitFlow Practice Modules */}
              <div className="space-y-2">
                <h4 className="font-mono text-[10px] text-phosphor uppercase tracking-wider font-semibold">
                  🎯 Recommended BitFlow Practice Modules
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedRole.bitflowModules.map((mod, idx) => (
                    <Link
                      key={idx}
                      href={mod.link}
                      className="group flex items-center justify-between p-3 rounded-lg border border-rim/50 bg-pit/60 hover:border-phosphor/50 hover:bg-pit transition-all"
                    >
                      <span className="font-mono text-[11px] text-pale group-hover:text-bright truncate">
                        {mod.title}
                      </span>
                      <span className="font-mono text-[10px] text-phosphor group-hover:translate-x-0.5 transition-transform">
                        Practice →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Career Outlook */}
              <div className="p-4 rounded-xl border border-phosphor/20 bg-phosphor/5 space-y-1">
                <h4 className="font-mono text-[10px] text-phosphor uppercase tracking-wider font-semibold">
                  💼 Core Industry Value
                </h4>
                <p className="font-mono text-[10px] text-ghost leading-relaxed">
                  {selectedRole.careerOutlook}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-rim/40 flex items-center justify-between">
              <Link
                href="/learn"
                onClick={() => setSelectedRole(null)}
                className="px-5 py-2.5 rounded-lg bg-phosphor text-void font-mono text-[11px] font-bold tracking-wider uppercase hover:bg-phosphor-glow transition-all shadow-[0_0_15px_rgba(0,232,122,0.25)]"
              >
                Start Learning Track →
              </Link>
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="font-mono text-[11px] text-dim hover:text-bright"
              >
                Back to Roadmap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
