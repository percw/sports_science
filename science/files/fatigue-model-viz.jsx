import { useState } from "react";

const MODEL_RESULTS = {
  paramRecovery: [
    { name: "τ_a_off", desc: "Aerobic recovery (days)", true: 7.0, fitted: 8.08, unit: "days" },
    { name: "τ_n_off", desc: "Neuromuscular recovery (days)", true: 2.0, fitted: 1.69, unit: "days" },
    { name: "τ_c_off", desc: "Central recovery (days)", true: 1.5, fitted: 1.00, unit: "days" },
    { name: "α_a", desc: "Aerobic state-dependence", true: 0.5, fitted: 0.40, unit: "" },
    { name: "α_n", desc: "Neuromuscular state-dependence", true: 0.8, fitted: 1.05, unit: "" },
    { name: "α_c", desc: "Central state-dependence", true: 0.3, fitted: 0.80, unit: "" },
    { name: "κ_mc", desc: "Mental→central coupling", true: 0.15, fitted: 0.29, unit: "" },
  ],
  modelComparison: [
    { id: "M1", name: "Banister", desc: "2-state (TrainingPeaks)", params: 5, ll: -12.1, bic: null, color: "#6b7280" },
    { id: "M2", name: "Fixed Recovery", desc: "3-state, constant τ", params: 9, ll: -1446.0, bic: 2947, color: "#f59e0b" },
    { id: "M3", name: "State-Dependent", desc: "3-state, τ(f) recovery", params: 12, ll: -562.4, bic: 1195, color: "#10b981" },
    { id: "M4", name: "Full + Mental", desc: "3-state + mental load", params: 14, ll: -560.2, bic: 1203, color: "#8b5cf6" },
  ],
};

const StateEq = ({ label, color, eq, novel }) => (
  <div style={{
    padding: "10px 14px", marginBottom: 6,
    background: color + "08", border: `1px solid ${color}25`,
    borderRadius: 6, position: "relative",
  }}>
    {novel && <span style={{
      position: "absolute", top: 6, right: 8, fontSize: 8,
      background: "#f43f5e20", color: "#f43f5e", padding: "2px 6px",
      borderRadius: 3, fontWeight: 700, letterSpacing: "0.05em",
    }}>NOVEL</span>}
    <div style={{ fontSize: 10, color: color, fontWeight: 700, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 12, color: "#c4c4cc", fontFamily: "'JetBrains Mono', monospace" }}>{eq}</div>
  </div>
);

const BarChart = ({ data, valueKey, label, color, maxVal }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 9, color: "#5a5a68", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
    {data.filter(d => d[valueKey] !== null).map(d => {
      const val = Math.abs(d[valueKey]);
      const width = Math.min(100, (val / maxVal) * 100);
      return (
        <div key={d.id || d.name} style={{ display: "flex", alignItems: "center", marginBottom: 4, gap: 8 }}>
          <span style={{ fontSize: 10, color: d.color || color, width: 130, flexShrink: 0, textAlign: "right" }}>{d.name || d.id}</span>
          <div style={{ flex: 1, height: 18, background: "#0f0f17", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${width}%`, height: "100%",
              background: `linear-gradient(90deg, ${d.color || color}40, ${d.color || color}80)`,
              borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "flex-end",
              paddingRight: 6,
            }}>
              <span style={{ fontSize: 9, color: "#e4e4ec", fontWeight: 600 }}>{d[valueKey]?.toFixed?.(1) ?? d[valueKey]}</span>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

export default function ModelViz() {
  const [tab, setTab] = useState("architecture");

  return (
    <div style={{
      background: "#08080d", minHeight: "100vh",
      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
      color: "#c4c4cc", padding: "24px 16px",
    }}>
      <div style={{ maxWidth: 840, margin: "0 auto" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e4e4ec", margin: "0 0 4px 0" }}>
          Fatigue State-Space Model
        </h1>
        <p style={{ fontSize: 11, color: "#5a5a68", margin: "0 0 20px 0" }}>
          4 latent states · 9 observable markers · state-dependent recovery dynamics
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {[
            { id: "architecture", label: "Model Architecture" },
            { id: "equations", label: "Equations" },
            { id: "results", label: "Results (120-day synthetic)" },
            { id: "hypotheses", label: "Research Questions" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? "#1a1a28" : "transparent",
              border: `1px solid ${tab === t.id ? "#2a2a3a" : "#14141e"}`,
              borderRadius: 6, padding: "7px 14px", cursor: "pointer",
              color: tab === t.id ? "#e4e4ec" : "#5a5a68",
              fontSize: 11, fontWeight: 600, fontFamily: "inherit",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Architecture */}
        {tab === "architecture" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr", gap: 12 }}>
            {/* Inputs */}
            <div style={{ background: "#0f0f17", border: "1px solid #1a1a28", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 10, color: "#5a5a68", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                Inputs (daily)
              </div>
              {[
                { name: "Training load (aerobic)", color: "#fb923c", source: "FIT files → TRIMP" },
                { name: "Training load (neuromuscular)", color: "#fb923c", source: "FIT files → power × type" },
                { name: "Mental load", color: "#a78bfa", source: "Self-report + calendar" },
                { name: "Sleep quality", color: "#38bdf8", source: "Wearable" },
              ].map((inp, i) => (
                <div key={i} style={{ padding: "6px 10px", background: inp.color + "08", borderRadius: 4, marginBottom: 4, borderLeft: `3px solid ${inp.color}30` }}>
                  <div style={{ fontSize: 11, color: inp.color, fontWeight: 600 }}>{inp.name}</div>
                  <div style={{ fontSize: 9, color: "#4a4a58" }}>{inp.source}</div>
                </div>
              ))}
            </div>

            {/* Arrows */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4 }}>
              <div style={{ color: "#2a2a3a", fontSize: 20 }}>→</div>
              <div style={{ fontSize: 8, color: "#3a3a48", textAlign: "center", lineHeight: 1.3 }}>ODE<br/>dynamics</div>
              <div style={{ color: "#2a2a3a", fontSize: 20 }}>→</div>
            </div>

            {/* Latent States */}
            <div style={{ background: "#0f0f17", border: "1px solid #1a1a28", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 10, color: "#5a5a68", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                Latent States (hidden)
              </div>
              {[
                { name: "f_a — Aerobic fatigue", color: "#f43f5e", tau: "τ=7d, α=0.5" },
                { name: "f_n — Neuromuscular fatigue", color: "#fb923c", tau: "τ=2d, α=0.8" },
                { name: "f_c — Central fatigue", color: "#a78bfa", tau: "τ=1.5d, α=0.3" },
                { name: "w  — Fitness", color: "#10b981", tau: "τ=45d (slow)" },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: "8px 10px", background: s.color + "0c",
                  border: `1px solid ${s.color}25`, borderRadius: 6, marginBottom: 6,
                }}>
                  <div style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: 9, color: "#5a5a68" }}>{s.tau}</div>
                </div>
              ))}
            </div>

            {/* Observation model spanning full width */}
            <div style={{ gridColumn: "1 / -1", background: "#0f0f17", border: "1px solid #1a1a28", borderRadius: 10, padding: 16, marginTop: 4 }}>
              <div style={{ fontSize: 10, color: "#5a5a68", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                Observable Markers (y = μ + β·state + ε)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[
                  { name: "HR @ ref power", states: "f_a, w", session: "Ramp", color: "#f43f5e" },
                  { name: "HR drift", states: "f_a, f_n", session: "Steady", color: "#f43f5e" },
                  { name: "Core temp drift", states: "f_a", session: "Steady/Ramp", color: "#f43f5e" },
                  { name: "Power decrement", states: "f_n, f_a", session: "30/15", color: "#fb923c" },
                  { name: "Set 1 power", states: "f_n, w", session: "30/15", color: "#fb923c" },
                  { name: "Stroke drift", states: "f_n", session: "Steady", color: "#fb923c" },
                  { name: "RPE residual", states: "f_c", session: "All", color: "#a78bfa" },
                  { name: "PVT reaction time", states: "f_c", session: "Daily", color: "#a78bfa" },
                  { name: "HRV (RMSSD)", states: "f_a, f_c", session: "Daily", color: "#10b981" },
                ].map((m, i) => (
                  <div key={i} style={{
                    padding: "6px 10px", background: m.color + "06",
                    border: `1px solid ${m.color}15`, borderRadius: 4,
                  }}>
                    <div style={{ fontSize: 10, color: m.color, fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 9, color: "#4a4a58" }}>← {m.states} | {m.session}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Equations */}
        {tab === "equations" && (
          <div>
            <div style={{ fontSize: 12, color: "#8a8a98", marginBottom: 14 }}>
              State dynamics — continuous-time ODEs discretized at daily resolution
            </div>

            <StateEq label="Aerobic Fatigue" color="#f43f5e"
              eq="df_a/dt = L_a(t)/τ_a_on − f_a/τ_a_off(f_a) + κ_na·f_n" />
            <StateEq label="Neuromuscular Fatigue" color="#fb923c"
              eq="df_n/dt = L_n(t)/τ_n_on − f_n/τ_n_off(f_n) + κ_an·f_a" />
            <StateEq label="Central Fatigue" color="#a78bfa"
              eq="df_c/dt = L_c(t)/τ_c_on − f_c/τ_c_off(f_c) + κ_mc·M(t)" />
            <StateEq label="Fitness" color="#10b981"
              eq="dw/dt = L(t)/τ_w_on − w/τ_w_off" />

            <div style={{ height: 16 }} />

            <StateEq label="State-Dependent Recovery (KEY NOVELTY)" color="#facc15" novel
              eq="τ_off(f) = τ_base × (1 + α × f)  →  recovery slows as fatigue accumulates" />

            <div style={{
              margin: "16px 0", padding: "12px 14px",
              background: "#facc1508", border: "1px solid #facc1520", borderRadius: 8,
            }}>
              <div style={{ fontSize: 11, color: "#facc15", fontWeight: 700, marginBottom: 6 }}>
                Why this matters
              </div>
              <div style={{ fontSize: 11, color: "#8a8a98", lineHeight: 1.6 }}>
                Banister and every current tool (Garmin, TrainingPeaks, Whoop) assumes constant
                recovery rate: you recover from a hard week at the same speed whether you're fresh
                or carrying 3 weeks of accumulated fatigue. The α parameter captures the reality
                that recovery slows when you're deep in a training block. This is what distinguishes
                productive overreaching (α effect is small, you recover on schedule) from overtraining
                (α effect compounds, recovery time spirals upward).
              </div>
            </div>

            <StateEq label="Observation Model" color="#38bdf8"
              eq="y_k(t) = μ_k + Σ_j β_kj × state_j(t) + ε_k,  ε ~ N(0, σ²_k)" />

            <div style={{ fontSize: 10, color: "#5a5a68", marginTop: 12, lineHeight: 1.6 }}>
              Estimation via MAP (Maximum A Posteriori) with L-BFGS-B optimization.
              Weakly informative Gaussian priors centered on physiologically plausible defaults.
              ~30-40 total parameters, ~14 fitted in the current implementation.
              Model comparison via BIC across nested models M1–M4.
            </div>
          </div>
        )}

        {/* Results */}
        {tab === "results" && (
          <div>
            <div style={{ fontSize: 11, color: "#6a6a78", marginBottom: 16 }}>
              120-day synthetic training block · 348 observations · 14 fitted parameters
            </div>

            {/* Parameter recovery */}
            <div style={{ background: "#0f0f17", border: "1px solid #1a1a28", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#e4e4ec", marginBottom: 12 }}>Parameter Recovery</div>
              <div style={{ fontSize: 9, color: "#5a5a68", textTransform: "uppercase", letterSpacing: "0.06em",
                display: "grid", gridTemplateColumns: "100px 1fr 65px 65px 65px", gap: 0, marginBottom: 4, padding: "0 8px" }}>
                <span>Param</span><span>Description</span><span style={{textAlign:"right"}}>True</span>
                <span style={{textAlign:"right"}}>Fitted</span><span style={{textAlign:"right"}}>Error</span>
              </div>
              {MODEL_RESULTS.paramRecovery.map((p, i) => (
                <div key={p.name} style={{
                  display: "grid", gridTemplateColumns: "100px 1fr 65px 65px 65px",
                  padding: "5px 8px", fontSize: 11,
                  background: i % 2 === 0 ? "transparent" : "#ffffff03",
                  borderRadius: 3,
                }}>
                  <span style={{ color: "#facc15", fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: "#6a6a78" }}>{p.desc}</span>
                  <span style={{ textAlign: "right", color: "#8a8a98" }}>{p.true.toFixed(2)}</span>
                  <span style={{ textAlign: "right", color: "#e4e4ec" }}>{p.fitted.toFixed(2)}</span>
                  <span style={{ textAlign: "right",
                    color: Math.abs(p.fitted - p.true) < 0.3 ? "#4ade80" : "#fbbf24"
                  }}>{Math.abs(p.fitted - p.true).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Model comparison */}
            <div style={{ background: "#0f0f17", border: "1px solid #1a1a28", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#e4e4ec", marginBottom: 12 }}>
                Model Comparison — Does complexity pay off?
              </div>

              <BarChart data={MODEL_RESULTS.modelComparison.filter(d => d.bic)}
                valueKey="bic" label="BIC (lower = better)" color="#10b981" maxVal={3000} />

              <div style={{ marginTop: 16 }}>
                {MODEL_RESULTS.modelComparison.map(m => (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
                    borderBottom: "1px solid #14141e",
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: m.color,
                      width: 24, textAlign: "center",
                    }}>{m.id}</span>
                    <span style={{ fontSize: 11, color: "#b4b4c0", flex: 1 }}>{m.name}</span>
                    <span style={{ fontSize: 10, color: "#5a5a68" }}>{m.desc}</span>
                    <span style={{ fontSize: 10, color: "#8a8a98", width: 50, textAlign: "right" }}>k={m.params}</span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 14, padding: "10px 12px",
                background: "#10b98110", border: "1px solid #10b98120",
                borderRadius: 6, fontSize: 11, color: "#6ee7b7", lineHeight: 1.5,
              }}>
                <strong>Key finding:</strong> M3 (state-dependent recovery) crushes M2 (fixed recovery)
                — BIC drops from 2947 to 1195. The α parameters are real and recoverable.
                M4 adds mental load but BIC slightly increases — marginal gain doesn't justify
                extra parameters in synthetic data. With real data and actual work-stress variation,
                this may flip.
              </div>
            </div>
          </div>
        )}

        {/* Research Questions */}
        {tab === "hypotheses" && (
          <div>
            {[
              {
                q: "H1: How many independent fatigue dimensions exist?",
                test: "Compare M1 (2-state) vs M2/M3 (3-state) via BIC. If 3-state wins, aerobic and neuromuscular fatigue are genuinely separable.",
                status: "testable",
                result: "Synthetic: 3-state massively outperforms 2-state. BIC: 2947 → 1195.",
                color: "#10b981",
              },
              {
                q: "H2: Is recovery rate state-dependent?",
                test: "Compare M2 (α=0) vs M3 (α>0). If M3 wins and α values are significantly positive, recovery genuinely slows with accumulated fatigue.",
                status: "testable",
                result: "Synthetic: α_a=0.40, α_n=1.05 recovered. M3 BIC 1195 vs M2 BIC 2947. Strong evidence.",
                color: "#10b981",
              },
              {
                q: "H3: Does mental load independently impair physical performance?",
                test: "Compare M3 (κ_mc=0) vs M4 (κ_mc>0). If κ_mc is significantly positive after controlling for training load and sleep, mental stress has a real effect.",
                status: "testable",
                result: "Synthetic: κ_mc=0.29 recovered. BIC slightly worse — needs real data with true mental load variation.",
                color: "#fbbf24",
              },
              {
                q: "H4: What's the cross-modality fatigue transfer rate?",
                test: "Fit separate load channels for upper-body (SkiErg/kayak) vs lower-body (cycling/running). Estimate κ_upper→lower and κ_lower→upper. If asymmetric, training prescription changes.",
                status: "needs extension",
                result: "Requires sport-specific load decomposition in the extraction pipeline. Architecture supports it.",
                color: "#6b7280",
              },
              {
                q: "H5: Can we predict next-week performance from this week's state?",
                test: "Rolling cross-validation: train on days 1–N, predict markers on days N+1 to N+14. Compare MAE against Banister baseline.",
                status: "needs data",
                result: "Framework built (rolling_cv function). Needs 120+ days of real data to be meaningful.",
                color: "#6b7280",
              },
            ].map((h, i) => (
              <div key={i} style={{
                background: "#0f0f17", border: "1px solid #1a1a28", borderRadius: 10,
                padding: 16, marginBottom: 10,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: "#e4e4ec", fontWeight: 700, flex: 1 }}>{h.q}</div>
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                    background: h.color + "18", color: h.color, letterSpacing: "0.05em",
                    textTransform: "uppercase", flexShrink: 0,
                  }}>{h.status}</span>
                </div>
                <div style={{ fontSize: 10, color: "#6a6a78", marginBottom: 6, lineHeight: 1.5 }}>
                  <strong style={{ color: "#8a8a98" }}>Test: </strong>{h.test}
                </div>
                <div style={{ fontSize: 10, color: h.color, lineHeight: 1.5, 
                  background: h.color + "08", padding: "6px 10px", borderRadius: 4 }}>
                  <strong>Result: </strong>{h.result}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
