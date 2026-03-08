import { useState } from "react";

const SESSIONS = [
  {
    id: "ramp",
    label: "Ramp Test",
    protocol: "5-min stages, +20-25W per stage, to failure",
    frequency: "1×/week (Wednesday)",
    color: "#fb923c",
    bg: "#1c1008",
    border: "#3d2510",
    markers: [
      {
        category: "Cardiac",
        items: [
          { name: "HR at fixed submaximal power", field: "hr_at_ref_power", unit: "bpm", why: "Primary aerobic fatigue marker. Pick a reference power (e.g. 180W) and track HR at that stage across weeks. +5bpm at same power = measurable fatigue.", sensitivity: "high" },
          { name: "HR recovery between stages", field: "hr_recovery_rate_bps", unit: "bpm/s", why: "How fast HR drops in the first 60s after each stage ends. Parasympathetic reactivation slows with accumulated fatigue before resting HR changes.", sensitivity: "high" },
          { name: "Cardiac decoupling slope", field: "cardiac_decoupling_slope", unit: "bpm/W", why: "Slope of HR vs power across stages. Steeper = less efficient. Tracks aerobic system integrity.", sensitivity: "medium" },
          { name: "Max HR achieved", field: "max_hr_bpm", unit: "bpm", why: "Ceiling drops 3-8bpm when overreached. Less useful weekly, more useful as monthly trend.", sensitivity: "low" },
        ],
      },
      {
        category: "Thermal",
        items: [
          { name: "Core temp at reference power", field: "core_temp_at_ref_power", unit: "°C", why: "Like HR at fixed power but for thermoregulation. Rises ~0.2-0.4°C earlier when fatigued. Less confounded by caffeine than HR.", sensitivity: "high" },
          { name: "Thermal rise rate", field: "thermal_rise_rate", unit: "°C/min", why: "Rate of core temp increase across stages. Accelerating rise = thermoregulatory strain. Integrates hydration, glycogen, and fatigue.", sensitivity: "high" },
          { name: "Temp at cessation", field: "core_temp_max", unit: "°C", why: "Max tolerated temp may shift with fatigue state and heat acclimatization.", sensitivity: "medium" },
        ],
      },
      {
        category: "Mechanical",
        items: [
          { name: "Last completed stage", field: "max_stage", unit: "stage #", why: "Coarse performance measure. Dropping a stage is a strong signal but insensitive to smaller changes.", sensitivity: "medium" },
          { name: "Stroke rate at reference power", field: "sr_at_ref_power", unit: "spm", why: "Rising stroke rate at same power = compensating for reduced force per stroke. Neuromuscular fatigue signal.", sensitivity: "medium" },
          { name: "Drive/recovery ratio per stage", field: "drive_recovery_ratio", unit: "ratio", why: "Drive time ÷ recovery time. Increases when force production capacity drops and you spend more time pulling.", sensitivity: "medium" },
        ],
      },
      {
        category: "Subjective",
        items: [
          { name: "RPE at reference power", field: "rpe_at_ref_power", unit: "1-10", why: "Same power feeling harder = central fatigue signal. Divergence between RPE and physiological markers is itself informative.", sensitivity: "high" },
        ],
      },
    ],
  },
  {
    id: "steady",
    label: "Steady State",
    protocol: "25-min at fixed power (~60-min power), constant target",
    frequency: "1×/week (Friday)",
    color: "#2dd4bf",
    bg: "#081c18",
    border: "#10382e",
    markers: [
      {
        category: "Cardiac",
        items: [
          { name: "HR drift (Δ min 5→25)", field: "hr_drift_abs", unit: "bpm", why: "THE classic durability marker. At constant power, HR creeping up reflects cardiovascular strain accumulation. +8bpm drift vs +3bpm drift across the same session = very different fatigue states.", sensitivity: "high" },
          { name: "HR drift rate", field: "hr_drift_rate", unit: "bpm/min", why: "Slope of HR over time at constant power. More granular than start-vs-end comparison. Captures whether drift is linear or accelerating.", sensitivity: "high" },
          { name: "HR variability within session", field: "hr_cv_session", unit: "%CV", why: "Beat-to-beat variability during steady work. Decreases as autonomic flexibility narrows under fatigue.", sensitivity: "medium" },
          { name: "Post-session HR recovery", field: "hr_rec_60s", unit: "bpm drop", why: "HR drop in first 60s after stopping. <20bpm drop is a red flag. Tracks parasympathetic reactivation capacity.", sensitivity: "high" },
        ],
      },
      {
        category: "Thermal",
        items: [
          { name: "Core temp drift (Δ min 5→25)", field: "core_temp_drift", unit: "°C", why: "Thermoregulatory equivalent of cardiac drift. May actually be MORE sensitive. A 0.5°C drift vs 0.3°C drift at same power/conditions = clear fatigue signal.", sensitivity: "high" },
          { name: "Temp drift rate", field: "core_temp_drift_rate", unit: "°C/min", why: "Captures whether thermal drift accelerates (bad sign) or stabilizes (adequate thermoregulation).", sensitivity: "high" },
          { name: "Time to thermal plateau", field: "time_to_thermal_plateau_min", unit: "min", why: "How long until core temp stabilizes. Never reaching plateau in 25 min = system under strain.", sensitivity: "medium" },
        ],
      },
      {
        category: "Mechanical",
        items: [
          { name: "Power variability", field: "power_cv", unit: "%CV", why: "Coefficient of variation of power output. Even at 'constant' power, variability increases with fatigue. Your motor control degrades.", sensitivity: "medium" },
          { name: "Stroke rate drift", field: "sr_drift", unit: "Δ spm", why: "Creeping stroke rate at constant power = force per stroke declining, compensated by tempo. Pure neuromuscular fatigue marker.", sensitivity: "high" },
          { name: "Drive time drift", field: "drive_time_drift_ms", unit: "Δ ms", why: "Drive phase lengthening = slower force production. Highly specific to peripheral fatigue.", sensitivity: "high" },
          { name: "Stroke consistency (SD)", field: "stroke_power_sd", unit: "W", why: "Standard deviation of stroke-to-stroke power. Increases as motor patterns degrade.", sensitivity: "medium" },
        ],
      },
      {
        category: "Subjective",
        items: [
          { name: "RPE at min 10 / min 20", field: "rpe_split", unit: "1-10, 1-10", why: "Two-point RPE captures how effort perception evolves. Same drift in HR but faster RPE climb = central fatigue component.", sensitivity: "high" },
        ],
      },
    ],
  },
  {
    id: "intervals",
    label: "30/15 Intervals",
    protocol: "3 sets × 10 reps × 30s ON / 15s OFF, ~90-95% MAP, 3-4 min between sets",
    frequency: "1×/week (Monday)",
    color: "#a78bfa",
    bg: "#130e22",
    border: "#271c44",
    markers: [
      {
        category: "Cardiac",
        items: [
          { name: "Avg HR per interval", field: "hr_per_rep[n]", unit: "bpm", why: "Array of 30 values. The HR accumulation curve across reps within a set and across sets IS the fatigue fingerprint.", sensitivity: "high" },
          { name: "HR at end of each rep", field: "hr_peak_per_rep[n]", unit: "bpm", why: "Peak HR trajectory across reps. How fast it climbs to ceiling reveals VO2 kinetics and fatigue state.", sensitivity: "high" },
          { name: "HR drop during 15s rest", field: "hr_drop_per_rest[n]", unit: "bpm", why: "Array of 30 values. Recovery capacity within the session. Declining drops across sets = parasympathetic fatigue.", sensitivity: "high" },
          { name: "HR drop between sets", field: "hr_drop_between_sets", unit: "bpm[]", why: "Recovery during 3-4 min rest. Less recovery between set 2→3 vs set 1→2 = accumulating autonomic fatigue.", sensitivity: "high" },
          { name: "Post-workout resting HR", field: "hr_post_10min", unit: "bpm", why: "HR at 10 min post-session. Elevated post-exercise HR on a given day vs your baseline = incomplete recovery going in.", sensitivity: "medium" },
        ],
      },
      {
        category: "Thermal",
        items: [
          { name: "Core temp per set (end)", field: "core_temp_end_set[n]", unit: "°C", why: "Temp at end of each set. The step-up pattern across sets reveals thermoregulatory load. Bigger jumps = more strain.", sensitivity: "high" },
          { name: "Core temp recovery between sets", field: "core_temp_drop_between_sets", unit: "°C[]", why: "Does temp drop during rest? If it keeps rising even during 3-4 min rest, that's a strong overload signal.", sensitivity: "high" },
          { name: "Thermal ceiling", field: "core_temp_max_session", unit: "°C", why: "Highest temp reached. If you're hitting 39.2°C on a day you usually hit 38.8°C at same protocol, something is off.", sensitivity: "medium" },
        ],
      },
      {
        category: "Mechanical",
        items: [
          { name: "Avg power per rep", field: "power_per_rep[n]", unit: "W[]", why: "The power decay curve across all 30 reps. Shape of this curve is the primary neuromuscular output. Steeper decay = more fatigued going in.", sensitivity: "high" },
          { name: "Power decrement score", field: "power_decrement_pct", unit: "%", why: "(1 - mean_power / peak_rep_power) × 100. Single number summary of fatigue resistance. Compare across weeks.", sensitivity: "high" },
          { name: "Intra-set power fade", field: "power_fade_per_set[n]", unit: "%[]", why: "Fade within each set separately. Set 1 fade vs set 3 fade tells you about peripheral vs accumulated fatigue.", sensitivity: "high" },
          { name: "Set 1 mean power", field: "power_set1_mean", unit: "W", why: "Closest proxy to 'fresh' neuromuscular capacity. Drop here means you came in fatigued.", sensitivity: "high" },
          { name: "Drive time per rep", field: "drive_time_per_rep[n]", unit: "ms[]", why: "Force production speed across reps. Lengthening drive = rate of force development declining.", sensitivity: "medium" },
          { name: "Stroke rate vs power decoupling", field: "sr_power_decoupling", unit: "ratio", why: "If stroke rate stays stable but power drops, you're producing less force per stroke. Pure peripheral fatigue.", sensitivity: "medium" },
        ],
      },
      {
        category: "Subjective",
        items: [
          { name: "RPE per set", field: "rpe_per_set[n]", unit: "1-10[]", why: "Three numbers. RPE climbing faster than physiological markers = central fatigue. RPE lagging behind markers = motivation masking.", sensitivity: "high" },
        ],
      },
    ],
  },
];

const SensitivityBadge = ({ level }) => {
  const colors = {
    high: { bg: "#22c55e18", text: "#4ade80", label: "HIGH" },
    medium: { bg: "#eab30818", text: "#fbbf24", label: "MED" },
    low: { bg: "#6b728018", text: "#9ca3af", label: "LOW" },
  };
  const c = colors[level];
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: "0.08em",
      background: c.bg, color: c.text,
      padding: "2px 6px", borderRadius: 3,
    }}>{c.label}</span>
  );
};

export default function MarkerSpec() {
  const [activeSession, setActiveSession] = useState("ramp");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const session = SESSIONS.find((s) => s.id === activeSession);

  const totalMarkers = session.markers.reduce((a, c) => a + c.items.length, 0);
  const highSens = session.markers.reduce((a, c) => a + c.items.filter(i => i.sensitivity === "high").length, 0);

  return (
    <div style={{
      background: "#08080d",
      minHeight: "100vh",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      color: "#c4c4cc",
      padding: "24px 16px",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            fontSize: 18, fontWeight: 700, color: "#e4e4ec",
            letterSpacing: "-0.02em", margin: 0,
          }}>
            Session Marker Extraction Spec
          </h1>
          <p style={{ fontSize: 11, color: "#5a5a68", margin: "6px 0 0 0" }}>
            Cardiac · Thermal (CORE) · Mechanical (PM5) · Subjective — per session type
          </p>
        </div>

        {/* Session tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 0 }}>
          {SESSIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setActiveSession(s.id); setExpandedCategory(null); }}
              style={{
                flex: 1,
                background: activeSession === s.id ? s.bg : "#0c0c14",
                border: `1px solid ${activeSession === s.id ? s.border : "#16161f"}`,
                borderBottom: activeSession === s.id ? `2px solid ${s.color}` : "1px solid #16161f",
                borderRadius: "8px 8px 0 0",
                padding: "10px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ color: activeSession === s.id ? s.color : "#5a5a68", fontSize: 12, fontWeight: 700 }}>
                {s.label}
              </div>
              <div style={{ color: "#3a3a48", fontSize: 9, marginTop: 2 }}>{s.frequency}</div>
            </button>
          ))}
        </div>

        {/* Session detail */}
        {session && (
          <div style={{
            background: session.bg,
            border: `1px solid ${session.border}`,
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            padding: "16px",
          }}>
            {/* Protocol bar */}
            <div style={{
              background: session.color + "08",
              border: `1px solid ${session.color}20`,
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <span style={{ fontSize: 9, color: "#5a5a68", textTransform: "uppercase", letterSpacing: "0.08em" }}>Protocol </span>
                <span style={{ fontSize: 11, color: "#b4b4c0" }}>{session.protocol}</span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 10 }}>
                <span style={{ color: session.color }}>{totalMarkers} markers</span>
                <span style={{ color: "#4ade80" }}>{highSens} high sensitivity</span>
              </div>
            </div>

            {/* Categories */}
            {session.markers.map((cat) => (
              <div key={cat.category} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setExpandedCategory(expandedCategory === cat.category ? null : cat.category)}
                  style={{
                    width: "100%",
                    background: expandedCategory === cat.category ? session.color + "0a" : "transparent",
                    border: `1px solid ${session.border}`,
                    borderRadius: expandedCategory === cat.category ? "6px 6px 0 0" : 6,
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.12s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      color: session.color, fontSize: 12, fontWeight: 600,
                    }}>{cat.category}</span>
                    <span style={{ color: "#3a3a48", fontSize: 10 }}>{cat.items.length} markers</span>
                  </div>
                  <span style={{
                    color: "#3a3a48", fontSize: 14,
                    transform: expandedCategory === cat.category ? "rotate(90deg)" : "rotate(0)",
                    transition: "transform 0.15s ease",
                  }}>›</span>
                </button>

                {expandedCategory === cat.category && (
                  <div style={{
                    border: `1px solid ${session.border}`,
                    borderTop: "none",
                    borderRadius: "0 0 6px 6px",
                    overflow: "hidden",
                  }}>
                    {cat.items.map((item, i) => (
                      <div key={item.field} style={{
                        padding: "10px 14px",
                        background: i % 2 === 0 ? "transparent" : session.color + "04",
                        borderBottom: i < cat.items.length - 1 ? `1px solid ${session.border}30` : "none",
                      }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "flex-start", marginBottom: 4,
                        }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ color: "#d4d4dc", fontSize: 11, fontWeight: 600 }}>
                              {item.name}
                            </span>
                            <span style={{
                              color: session.color, opacity: 0.5, fontSize: 10,
                              marginLeft: 8,
                            }}>
                              {item.unit}
                            </span>
                          </div>
                          <SensitivityBadge level={item.sensitivity} />
                        </div>
                        <div style={{
                          fontSize: 10, color: "#6a6a78", lineHeight: 1.5,
                          marginBottom: 4,
                        }}>
                          {item.why}
                        </div>
                        <code style={{
                          fontSize: 9, color: session.color, opacity: 0.6,
                          background: session.color + "0a",
                          padding: "2px 6px", borderRadius: 3,
                        }}>
                          {item.field}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Summary row */}
            <div style={{
              marginTop: 14, padding: "12px 14px",
              background: session.color + "06",
              borderRadius: 6,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              fontSize: 10,
            }}>
              {session.markers.map(cat => (
                <div key={cat.category} style={{ textAlign: "center" }}>
                  <div style={{ color: session.color, fontWeight: 700, fontSize: 16 }}>
                    {cat.items.length}
                  </div>
                  <div style={{ color: "#4a4a58" }}>{cat.category}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cross-session insight */}
        <div style={{
          marginTop: 20,
          background: "#0c0c14",
          border: "1px solid #1a1a24",
          borderRadius: 10,
          padding: "16px",
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#e4e4ec",
            marginBottom: 10,
          }}>
            Cross-Session Derived Signals
          </div>
          {[
            {
              name: "Cardiac–thermal decoupling",
              desc: "When HR drift and core temp drift diverge at same power, it indicates different fatigue mechanisms. HR up + temp stable = cardiac drift (plasma volume). Both up = systemic fatigue. Temp up + HR stable = thermoregulatory stress (dehydration, glycogen).",
              sessions: ["steady", "ramp"],
            },
            {
              name: "Subjective–objective divergence",
              desc: "RPE climbing faster than HR/power markers = central fatigue (brain limiting before body). RPE lagging behind physiological markers = possible overreaching where perception is suppressed.",
              sessions: ["steady", "intervals"],
            },
            {
              name: "Neuromuscular ↔ aerobic dissociation",
              desc: "Set 1 power in 30/15 session (neuromuscular ceiling) vs HR@180W in ramp (aerobic efficiency) tracking differently over weeks reveals which system is accumulating fatigue.",
              sessions: ["intervals", "ramp"],
            },
            {
              name: "Recovery capacity trajectory",
              desc: "HR drop during 15s rests (intervals), HR recovery between stages (ramp), and post-session HR recovery (all three) — if all decline together, parasympathetic system is overloaded. If only within-session recovery drops, it's acute not accumulated.",
              sessions: ["intervals", "ramp", "steady"],
            },
          ].map((signal, i) => (
            <div key={i} style={{
              padding: "10px 12px",
              borderBottom: i < 3 ? "1px solid #16161f" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ color: "#d4d4dc", fontSize: 11, fontWeight: 600 }}>{signal.name}</span>
                <span style={{ display: "flex", gap: 3 }}>
                  {signal.sessions.map(s => {
                    const sess = SESSIONS.find(x => x.id === s);
                    return (
                      <span key={s} style={{
                        fontSize: 8, background: sess.color + "18",
                        color: sess.color, padding: "1px 5px", borderRadius: 3,
                      }}>{sess.label}</span>
                    );
                  })}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "#5a5a68", lineHeight: 1.5 }}>
                {signal.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
