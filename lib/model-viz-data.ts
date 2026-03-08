export const MODEL_RESULTS = {
  paramRecovery: [
    { name: "tau_a_off", desc: "Aerobic recovery", true: 7.0, fitted: 8.08, unit: "days" },
    { name: "tau_n_off", desc: "Neuromuscular recovery", true: 2.0, fitted: 1.69, unit: "days" },
    { name: "tau_c_off", desc: "Central recovery", true: 1.5, fitted: 1.0, unit: "days" },
    { name: "alpha_a", desc: "Aerobic state-dependence", true: 0.5, fitted: 0.4, unit: "" },
    { name: "alpha_n", desc: "Neuromuscular state-dependence", true: 0.8, fitted: 1.05, unit: "" },
    { name: "alpha_c", desc: "Central state-dependence", true: 0.3, fitted: 0.8, unit: "" },
    { name: "kappa_mc", desc: "Mental to central coupling", true: 0.15, fitted: 0.29, unit: "" },
  ],
  modelComparison: [
    { id: "M1", name: "Banister", desc: "2-state (TrainingPeaks)", params: 5, ll: -12.1, bic: null, color: "#7a7f89" },
    { id: "M2", name: "Fixed Recovery", desc: "3-state, constant tau", params: 9, ll: -1446.0, bic: 2947, color: "#d78a2c" },
    { id: "M3", name: "State-Dependent", desc: "3-state, tau(f) recovery", params: 12, ll: -562.4, bic: 1195, color: "#2c8f66" },
    { id: "M4", name: "Full + Mental", desc: "3-state + mental load", params: 14, ll: -560.2, bic: 1203, color: "#6f4b8e" },
  ],
  hypotheses: [
    {
      q: "How many independent fatigue dimensions exist?",
      test: "Compare 2-state and 3-state models by BIC.",
      result: "Synthetic data strongly favors separable aerobic and neuromuscular fatigue.",
      status: "testable",
      color: "#2c8f66",
    },
    {
      q: "Is recovery rate state-dependent?",
      test: "Compare fixed recovery against tau(f) recovery using the alpha terms.",
      result: "State-dependent recovery sharply improves fit and recovers positive alpha values.",
      status: "testable",
      color: "#2c8f66",
    },
    {
      q: "Does mental load independently impair physical output?",
      test: "Estimate kappa_mc after controlling for training load and sleep.",
      result: "The coupling is recoverable, but real data is needed for a decisive gain over M3.",
      status: "emerging",
      color: "#bf6534",
    },
    {
      q: "What is the cross-modality transfer rate?",
      test: "Separate upper and lower-body load channels and estimate directional transfer.",
      result: "The extraction pipeline can support this once modality decomposition is added.",
      status: "next",
      color: "#6e6558",
    },
  ],
};

export const MODEL_ARCHITECTURE = {
  inputs: [
    { name: "Training load (aerobic)", source: "FIT files to TRIMP", color: "#bf6534" },
    { name: "Training load (neuromuscular)", source: "Power plus session type", color: "#bf6534" },
    { name: "Mental load", source: "Self-report plus calendar", color: "#5f466f" },
    { name: "Sleep quality", source: "Wearable or manual", color: "#195c72" },
  ],
  states: [
    { name: "f_a", label: "Aerobic fatigue", color: "#8a423e", meta: "tau 7d, alpha 0.5" },
    { name: "f_n", label: "Neuromuscular fatigue", color: "#bf6534", meta: "tau 2d, alpha 0.8" },
    { name: "f_c", label: "Central fatigue", color: "#5f466f", meta: "tau 1.5d, alpha 0.3" },
    { name: "w", label: "Fitness", color: "#25624b", meta: "tau 45d slow state" },
  ],
  markers: [
    { name: "HR @ ref power", states: "f_a, w", session: "Ramp", color: "#8a423e" },
    { name: "HR drift", states: "f_a, f_n", session: "Steady", color: "#8a423e" },
    { name: "Core temp drift", states: "f_a", session: "Steady / Ramp", color: "#8a423e" },
    { name: "Power decrement", states: "f_n, f_a", session: "30/15", color: "#bf6534" },
    { name: "Set 1 power", states: "f_n, w", session: "30/15", color: "#bf6534" },
    { name: "Stroke drift", states: "f_n", session: "Steady", color: "#bf6534" },
    { name: "RPE residual", states: "f_c", session: "All", color: "#5f466f" },
    { name: "PVT reaction time", states: "f_c", session: "Daily", color: "#5f466f" },
    { name: "HRV RMSSD", states: "f_a, f_c", session: "Daily", color: "#25624b" },
  ],
};

export const MODEL_EQUATIONS = [
  {
    label: "Aerobic fatigue",
    color: "#8a423e",
    eq: "df_a/dt = L_a / tau_a_on - f_a / tau_a_off(f_a) + kappa_na * f_n",
  },
  {
    label: "Neuromuscular fatigue",
    color: "#bf6534",
    eq: "df_n/dt = L_n / tau_n_on - f_n / tau_n_off(f_n) + kappa_an * f_a",
  },
  {
    label: "Central fatigue",
    color: "#5f466f",
    eq: "df_c/dt = L_c / tau_c_on - f_c / tau_c_off(f_c) + kappa_mc * M(t)",
  },
  {
    label: "Fitness",
    color: "#25624b",
    eq: "dw/dt = L / tau_w_on - w / tau_w_off",
  },
  {
    label: "State-dependent recovery",
    color: "#d8b15b",
    eq: "tau_off(f) = tau_base * (1 + alpha * f)",
    novel: true,
  },
  {
    label: "Observation model",
    color: "#195c72",
    eq: "y_k(t) = mu_k + sum(beta_kj * state_j(t)) + epsilon_k",
  },
];
