import { useState } from "react";

const LAYERS = [
  {
    id: "daily",
    label: "Daily State",
    color: "#2dd4bf",
    bgColor: "#042f2e",
    borderColor: "#134e4a",
    description: "Morning capture — 3 min protocol",
    frequency: "Every morning before rising",
    fields: [
      { name: "date", type: "DATE", pk: true, example: "2026-03-06" },
      { name: "resting_hr_bpm", type: "FLOAT", source: "Wearable", example: "48.2" },
      { name: "hrv_rmssd_ms", type: "FLOAT", source: "Wearable/App", example: "72.4" },
      { name: "hrv_sdnn_ms", type: "FLOAT", source: "Wearable/App", example: "95.1" },
      { name: "sleep_duration_min", type: "INT", source: "Wearable", example: "462" },
      { name: "sleep_deep_min", type: "INT", source: "Wearable", example: "105" },
      { name: "sleep_rem_min", type: "INT", source: "Wearable", example: "98" },
      { name: "sleep_quality_1_5", type: "INT", source: "Self-report", example: "4" },
      { name: "body_weight_kg", type: "FLOAT", source: "Scale", example: "82.3" },
      { name: "soreness_1_5", type: "INT", source: "Self-report", example: "3" },
      { name: "motivation_1_5", type: "INT", source: "Self-report", example: "4" },
      { name: "mood_1_5", type: "INT", source: "Self-report", example: "4" },
      { name: "energy_1_5", type: "INT", source: "Self-report", example: "3" },
      { name: "spo2_pct", type: "FLOAT", source: "Wearable", example: "97.2" },
      { name: "resp_rate_brpm", type: "FLOAT", source: "Wearable", example: "13.8" },
    ],
  },
  {
    id: "mental",
    label: "Mental Load",
    color: "#a78bfa",
    bgColor: "#1e1035",
    borderColor: "#3b2070",
    description: "Cognitive & psychological stress capture",
    frequency: "Daily evening + automated",
    fields: [
      { name: "date", type: "DATE", pk: true, example: "2026-03-06" },
      { name: "perceived_stress_1_5", type: "INT", source: "Self-report", example: "3", note: "Overall stress" },
      { name: "cognitive_demand_1_5", type: "INT", source: "Self-report", example: "4", note: "How hard did you think today" },
      { name: "emotional_valence_1_5", type: "INT", source: "Self-report", example: "3", note: "1=very negative, 5=very positive" },
      { name: "focus_quality_1_5", type: "INT", source: "Self-report", example: "4", note: "Ability to concentrate" },
      { name: "pvt_mean_rt_ms", type: "FLOAT", source: "PVT App", example: "287.4", note: "Psychomotor vigilance test" },
      { name: "pvt_lapses", type: "INT", source: "PVT App", example: "1", note: "Reactions >500ms" },
      { name: "screen_time_min", type: "INT", source: "Phone API", example: "312", note: "Total screen time" },
      { name: "deep_work_min", type: "INT", source: "Toggl/RescueTime", example: "185", note: "Focused work blocks" },
      { name: "meetings_count", type: "INT", source: "Calendar API", example: "4", note: "Auto-extracted" },
      { name: "context_switches", type: "INT", source: "Calendar API", example: "7", note: "Topic changes in schedule" },
      { name: "calendar_density_min", type: "INT", source: "Calendar API", example: "240", note: "Total scheduled time" },
      { name: "life_stress_events", type: "TEXT", source: "Self-report", example: "deadline|travel", note: "Pipe-separated tags" },
    ],
  },
  {
    id: "session",
    label: "Training Sessions",
    color: "#fb923c",
    bgColor: "#351a08",
    borderColor: "#5c2d0e",
    description: "Per-session training data",
    frequency: "Every session (1-3x daily)",
    fields: [
      { name: "session_id", type: "UUID", pk: true, example: "a3f8c..." },
      { name: "date", type: "DATE", fk: "daily", example: "2026-03-06" },
      { name: "start_time", type: "TIMESTAMP", source: "Device", example: "07:15:00" },
      { name: "duration_min", type: "INT", source: "Device", example: "72" },
      { name: "sport", type: "ENUM", source: "Manual", example: "skierg", note: "kayak|skierg|cycling|xc_ski|run|strength" },
      { name: "session_type", type: "ENUM", source: "Manual", example: "intervals", note: "steady|intervals|race|test|strength" },
      { name: "body_region", type: "ENUM", source: "Derived", example: "upper", note: "upper|lower|full — for cross-modality" },
      { name: "contraction_type", type: "ENUM", source: "Derived", example: "concentric", note: "concentric|eccentric|mixed" },
      { name: "tss_score", type: "FLOAT", source: "Derived", example: "185.3" },
      { name: "trimp_score", type: "FLOAT", source: "Derived", example: "142.0" },
      { name: "avg_power_w", type: "FLOAT", source: "Device", example: "215.4" },
      { name: "norm_power_w", type: "FLOAT", source: "Derived", example: "238.1" },
      { name: "avg_hr_bpm", type: "FLOAT", source: "Device", example: "155.2" },
      { name: "max_hr_bpm", type: "FLOAT", source: "Device", example: "178.0" },
      { name: "time_in_z1_min", type: "FLOAT", source: "Derived", example: "12.0" },
      { name: "time_in_z2_min", type: "FLOAT", source: "Derived", example: "35.0" },
      { name: "time_in_z3_min", type: "FLOAT", source: "Derived", example: "15.0" },
      { name: "time_in_z4_min", type: "FLOAT", source: "Derived", example: "8.0" },
      { name: "time_in_z5_min", type: "FLOAT", source: "Derived", example: "2.0" },
      { name: "session_rpe_1_10", type: "INT", source: "Self-report", example: "7" },
      { name: "lactate_post_mmol", type: "FLOAT", source: "Lactate Pro", example: "6.8", note: "Optional" },
      { name: "raw_file_path", type: "TEXT", source: "System", example: "/data/fit/2026-03-06_am.fit" },
    ],
  },
  {
    id: "timeseries",
    label: "Session Timeseries",
    color: "#38bdf8",
    bgColor: "#082f49",
    borderColor: "#0c4a6e",
    description: "Second-by-second or stroke-by-stroke",
    frequency: "1Hz or per-stroke",
    fields: [
      { name: "session_id", type: "UUID", fk: "session", example: "a3f8c..." },
      { name: "timestamp_ms", type: "BIGINT", pk: true, example: "1709712900000" },
      { name: "power_w", type: "FLOAT", source: "PM5/Power meter", example: "245.0" },
      { name: "heart_rate_bpm", type: "INT", source: "HR strap", example: "162" },
      { name: "cadence_spm", type: "FLOAT", source: "Device", example: "28.5" },
      { name: "stroke_distance_m", type: "FLOAT", source: "PM5", example: "9.82", note: "Concept2 only" },
      { name: "drive_time_ms", type: "INT", source: "PM5", example: "680", note: "Concept2 only" },
      { name: "recovery_time_ms", type: "INT", source: "PM5", example: "920", note: "Concept2 only" },
    ],
  },
  {
    id: "performance",
    label: "Performance Tests",
    color: "#f43f5e",
    bgColor: "#350c14",
    borderColor: "#5c1525",
    description: "Ground truth — your dependent variable",
    frequency: "Weekly standardized tests",
    fields: [
      { name: "test_id", type: "UUID", pk: true, example: "b7d2e..." },
      { name: "date", type: "DATE", fk: "daily", example: "2026-03-06" },
      { name: "session_id", type: "UUID", fk: "session", example: "a3f8c..." },
      { name: "test_protocol", type: "ENUM", source: "Manual", example: "2k_skierg", note: "2k_skierg|4min_max|ramp_test|30s_sprint" },
      { name: "sport", type: "ENUM", source: "Manual", example: "skierg" },
      { name: "result_time_s", type: "FLOAT", source: "Device", example: "398.2", note: "For time-trial protocols" },
      { name: "result_avg_power_w", type: "FLOAT", source: "Device", example: "265.4" },
      { name: "result_peak_power_w", type: "FLOAT", source: "Device", example: "412.0" },
      { name: "result_avg_hr_bpm", type: "FLOAT", source: "Device", example: "172.3" },
      { name: "result_max_hr_bpm", type: "FLOAT", source: "Device", example: "186.0" },
      { name: "critical_power_w", type: "FLOAT", source: "Derived", example: "198.5", note: "From ramp/step test" },
      { name: "w_prime_kj", type: "FLOAT", source: "Derived", example: "18.2", note: "Anaerobic capacity" },
      { name: "pct_of_personal_best", type: "FLOAT", source: "Derived", example: "94.7" },
      { name: "test_rpe_1_10", type: "INT", source: "Self-report", example: "9" },
      { name: "conditions_note", type: "TEXT", source: "Manual", example: "felt sluggish from km 1" },
    ],
  },
  {
    id: "derived",
    label: "Derived Features",
    color: "#facc15",
    bgColor: "#2a2005",
    borderColor: "#4a3808",
    description: "Computed rolling features for modeling",
    frequency: "Computed daily from raw tables",
    fields: [
      { name: "date", type: "DATE", pk: true, example: "2026-03-06" },
      { name: "atl_7d", type: "FLOAT", source: "Computed", example: "112.4", note: "Acute load (7d EWMA)" },
      { name: "ctl_42d", type: "FLOAT", source: "Computed", example: "88.2", note: "Chronic load (42d EWMA)" },
      { name: "tsb", type: "FLOAT", source: "Computed", example: "-24.2", note: "Training stress balance" },
      { name: "acwr", type: "FLOAT", source: "Computed", example: "1.27", note: "Acute:chronic ratio" },
      { name: "load_upper_7d", type: "FLOAT", source: "Computed", example: "65.0", note: "Modality-specific loads" },
      { name: "load_lower_7d", type: "FLOAT", source: "Computed", example: "47.4" },
      { name: "load_eccentric_7d", type: "FLOAT", source: "Computed", example: "32.0", note: "Contraction-specific" },
      { name: "hrv_7d_cv", type: "FLOAT", source: "Computed", example: "0.12", note: "HRV coefficient of variation" },
      { name: "hrv_trend_slope", type: "FLOAT", source: "Computed", example: "-0.8", note: "7d linear trend" },
      { name: "rhr_delta_7d", type: "FLOAT", source: "Computed", example: "+2.1", note: "RHR vs 7d baseline" },
      { name: "sleep_debt_min", type: "FLOAT", source: "Computed", example: "-45.0", note: "Cumulative vs target" },
      { name: "mental_load_7d_avg", type: "FLOAT", source: "Computed", example: "3.2", note: "Rolling mental stress" },
      { name: "mental_load_acute", type: "FLOAT", source: "Computed", example: "4.1", note: "3d spike detection" },
      { name: "pvt_trend_slope", type: "FLOAT", source: "Computed", example: "+5.2", note: "Cognitive fatigue trend" },
      { name: "combined_load_index", type: "FLOAT", source: "Model", example: "0.73", note: "Physical + mental composite" },
      { name: "monotony_7d", type: "FLOAT", source: "Computed", example: "1.8", note: "Load variability (Foster)" },
      { name: "strain_7d", type: "FLOAT", source: "Computed", example: "202.3", note: "Load × monotony" },
    ],
  },
];

const RelationshipDiagram = () => (
  <svg viewBox="0 0 520 200" className="w-full" style={{ maxWidth: 520 }}>
    {/* Nodes */}
    {[
      { x: 260, y: 25, label: "Daily State", color: "#2dd4bf" },
      { x: 80, y: 25, label: "Mental Load", color: "#a78bfa" },
      { x: 260, y: 100, label: "Sessions", color: "#fb923c" },
      { x: 440, y: 100, label: "Timeseries", color: "#38bdf8" },
      { x: 80, y: 100, label: "Perf Tests", color: "#f43f5e" },
      { x: 260, y: 175, label: "Derived", color: "#facc15" },
    ].map((n, i) => (
      <g key={i}>
        <rect x={n.x - 55} y={n.y - 14} width={110} height={28} rx={6}
          fill={n.color + "18"} stroke={n.color} strokeWidth={1.5} />
        <text x={n.x} y={n.y + 5} textAnchor="middle"
          fill={n.color} fontSize={11} fontWeight={600} fontFamily="monospace">{n.label}</text>
      </g>
    ))}
    {/* Edges */}
    {[
      { x1: 260, y1: 39, x2: 260, y2: 86, color: "#fb923c44" },
      { x1: 135, y1: 25, x2: 205, y2: 25, color: "#a78bfa44" },
      { x1: 135, y1: 100, x2: 205, y2: 100, color: "#f43f5e44" },
      { x1: 315, y1: 100, x2: 385, y2: 100, color: "#38bdf844" },
      { x1: 260, y1: 114, x2: 260, y2: 161, color: "#facc1544" },
      { x1: 160, y1: 35, x2: 220, y2: 161, color: "#facc1544", dash: true },
    ].map((e, i) => (
      <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
        stroke={e.color} strokeWidth={2} strokeDasharray={e.dash ? "5,4" : "none"} />
    ))}
    <text x={260} y={70} textAnchor="middle" fill="#666" fontSize={9} fontFamily="monospace">date FK</text>
    <text x={350} y={93} textAnchor="middle" fill="#666" fontSize={9} fontFamily="monospace">session_id FK</text>
    <text x={170} y={18} textAnchor="middle" fill="#666" fontSize={9} fontFamily="monospace">date FK</text>
    <text x={170} y={93} textAnchor="middle" fill="#666" fontSize={9} fontFamily="monospace">session_id FK</text>
    <text x={225} y={145} textAnchor="middle" fill="#666" fontSize={9} fontFamily="monospace">aggregates all ↑</text>
  </svg>
);

export default function FatigueSchema() {
  const [activeLayer, setActiveLayer] = useState("daily");
  const layer = LAYERS.find((l) => l.id === activeLayer);

  return (
    <div style={{
      background: "#0a0a0f",
      minHeight: "100vh",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      color: "#c4c4cc",
      padding: "24px 16px",
    }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontSize: 20, fontWeight: 700, color: "#e4e4ec",
            letterSpacing: "-0.02em", margin: 0,
          }}>
            Multi-Timescale Fatigue Model
          </h1>
          <p style={{ fontSize: 12, color: "#6b6b78", margin: "6px 0 0 0" }}>
            Data architecture · 6 tables · physical + cognitive + performance
          </p>
        </div>

        {/* ER Diagram */}
        <div style={{
          background: "#0f0f17", border: "1px solid #1a1a28", borderRadius: 10,
          padding: "20px 16px 12px", marginBottom: 20,
        }}>
          <p style={{ fontSize: 10, color: "#4a4a58", margin: "0 0 10px 0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Entity Relationships
          </p>
          <RelationshipDiagram />
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 2,
        }}>
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveLayer(l.id)}
              style={{
                background: activeLayer === l.id ? l.bgColor : "transparent",
                border: `1px solid ${activeLayer === l.id ? l.borderColor : "#1a1a28"}`,
                borderBottom: activeLayer === l.id ? `1px solid ${l.bgColor}` : `1px solid #1a1a28`,
                borderRadius: "8px 8px 0 0",
                padding: "8px 14px",
                color: activeLayer === l.id ? l.color : "#5a5a68",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Active Table */}
        {layer && (
          <div style={{
            background: layer.bgColor,
            border: `1px solid ${layer.borderColor}`,
            borderRadius: "0 10px 10px 10px",
            padding: "20px 16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div>
                <span style={{ color: layer.color, fontSize: 14, fontWeight: 700 }}>{layer.label}</span>
                <span style={{ color: "#5a5a68", fontSize: 11, marginLeft: 10 }}>{layer.description}</span>
              </div>
              <span style={{
                fontSize: 9, color: layer.color, opacity: 0.6,
                background: layer.color + "12", padding: "3px 8px", borderRadius: 4,
              }}>
                {layer.frequency}
              </span>
            </div>

            {/* Column Headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "minmax(180px, 1.4fr) 70px 100px 80px 1fr",
              gap: 0,
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#4a4a58",
              borderBottom: `1px solid ${layer.borderColor}`,
              padding: "0 8px 6px",
              marginBottom: 2,
            }}>
              <span>Field</span>
              <span>Type</span>
              <span>Source</span>
              <span>Example</span>
              <span>Note</span>
            </div>

            {/* Rows */}
            {layer.fields.map((f, i) => (
              <div
                key={f.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(180px, 1.4fr) 70px 100px 80px 1fr",
                  gap: 0,
                  padding: "5px 8px",
                  fontSize: 11,
                  borderBottom: i < layer.fields.length - 1 ? `1px solid ${layer.borderColor}40` : "none",
                  background: i % 2 === 0 ? "transparent" : layer.color + "04",
                  alignItems: "center",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#e4e4ec", fontWeight: 500 }}>{f.name}</span>
                  {f.pk && <span style={{
                    fontSize: 8, background: layer.color + "25", color: layer.color,
                    padding: "1px 5px", borderRadius: 3, fontWeight: 700,
                  }}>PK</span>}
                  {f.fk && <span style={{
                    fontSize: 8, background: "#ffffff10", color: "#8888a0",
                    padding: "1px 5px", borderRadius: 3,
                  }}>FK→{f.fk}</span>}
                </span>
                <span style={{ color: "#6b6b78" }}>{f.type}</span>
                <span style={{ color: "#5a5a68", fontSize: 10 }}>{f.source || "—"}</span>
                <span style={{ color: layer.color, opacity: 0.7, fontSize: 10 }}>{f.example}</span>
                <span style={{ color: "#4a4a58", fontSize: 10 }}>{f.note || ""}</span>
              </div>
            ))}

            <div style={{ marginTop: 12, fontSize: 10, color: "#4a4a58" }}>
              {layer.fields.length} fields · {layer.fields.filter(f => f.source === "Self-report").length} self-report · {layer.fields.filter(f => f.source === "Computed" || f.source === "Derived" || f.source === "Model").length} computed
            </div>
          </div>
        )}

        {/* Footer stats */}
        <div style={{
          marginTop: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
        }}>
          {[
            { label: "Total fields", value: LAYERS.reduce((a, l) => a + l.fields.length, 0) },
            { label: "Self-report inputs", value: LAYERS.reduce((a, l) => a + l.fields.filter(f => f.source === "Self-report").length, 0) + "/day" },
            { label: "Morning protocol", value: "~3 min" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "#0f0f17", border: "1px solid #1a1a28", borderRadius: 8,
              padding: "12px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#e4e4ec" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#4a4a58", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
