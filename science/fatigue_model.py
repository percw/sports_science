"""
Multi-Timescale Fatigue State-Space Model
==========================================

Core scientific model: estimates latent fatigue states from observable markers.

MATHEMATICAL FORMULATION
========================

Latent States (unobservable):
  f_a(t) — aerobic fatigue (tracks cardiac/thermal drift)
  f_n(t) — neuromuscular fatigue (tracks power output / motor patterns)
  f_c(t) — central fatigue (tracks cognitive load, motivation, RPE)
  w(t)   — fitness (slow positive adaptation)

State Dynamics (continuous-time ODEs, discretized daily):

  df_a/dt = L_a(t) / τ_a_on  −  f_a / τ_a_off(f_a)
  df_n/dt = L_n(t) / τ_n_on  −  f_n / τ_n_off(f_n)
  df_c/dt = L_c(t) / τ_c_on  −  f_c / τ_c_off(f_c)
  dw/dt   = L(t)   / τ_w_on  −  w   / τ_w_off

  KEY NOVELTY: State-dependent recovery
    τ_x_off(f_x) = τ_x_base × (1 + α_x × f_x)
    Recovery SLOWS as fatigue accumulates.

  Cross-talk:
    df_c/dt += κ_mc × M(t)  (mental load drives central fatigue)

Observation Model:
  Each marker y_k = μ_k + Σ β_kj × state_j + ε_k

Estimation: MAP via L-BFGS-B with weakly informative priors.
"""

import numpy as np
from scipy.optimize import minimize, differential_evolution
from dataclasses import dataclass, field
from typing import Optional, List, Tuple
import json
import warnings
warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────
# 1. MODEL PARAMETERS
# ─────────────────────────────────────────────

@dataclass
class FatigueModelParams:
    """All learnable parameters of the fatigue state-space model."""

    # State dynamics: onset time constants (days)
    tau_a_on: float = 3.0
    tau_n_on: float = 1.5
    tau_c_on: float = 1.0
    tau_w_on: float = 30.0

    # Base recovery time constants (days)
    tau_a_off: float = 7.0
    tau_n_off: float = 2.0
    tau_c_off: float = 1.5
    tau_w_off: float = 45.0

    # State-dependent recovery (KEY NOVELTY)
    alpha_a: float = 0.5
    alpha_n: float = 0.8
    alpha_c: float = 0.3

    # Cross-talk
    kappa_na: float = 0.05
    kappa_an: float = 0.03
    kappa_mc: float = 0.15

    # Load scaling
    load_scale_a: float = 0.01
    load_scale_n: float = 0.01
    load_scale_c: float = 0.10
    load_scale_w: float = 0.005

    # Observation baselines
    mu_hr_ref: float = 150.0
    mu_hr_drift: float = 5.0
    mu_temp_drift: float = 0.2
    mu_power_dec: float = 3.0
    mu_set1_power: float = 270.0
    mu_stroke_drift: float = 0.5
    mu_rpe_residual: float = 0.0
    mu_pvt: float = 280.0
    mu_hrv: float = 70.0

    # Observation loadings
    beta_a_hr_ref: float = 15.0
    beta_a_hr_drift: float = 20.0
    beta_a_temp_drift: float = 0.3
    beta_a_power_dec: float = 3.0
    beta_a_hrv: float = -20.0
    beta_n_hr_drift: float = 5.0
    beta_n_power_dec: float = 8.0
    beta_n_set1_power: float = -30.0
    beta_n_stroke_drift: float = 2.0
    beta_c_rpe: float = 2.0
    beta_c_pvt: float = 25.0
    beta_c_hrv: float = -10.0
    beta_w_hr_ref: float = -5.0
    beta_w_set1_power: float = 15.0

    # Observation noise
    sigma_hr_ref: float = 3.0
    sigma_hr_drift: float = 4.0
    sigma_temp_drift: float = 0.08
    sigma_power_dec: float = 2.0
    sigma_set1_power: float = 8.0
    sigma_stroke_drift: float = 0.3
    sigma_rpe: float = 0.8
    sigma_pvt: float = 15.0
    sigma_hrv: float = 8.0

    def to_vector(self):
        return np.array([getattr(self, f) for f in self.__dataclass_fields__])

    @classmethod
    def from_vector(cls, vec):
        fields = list(cls.__dataclass_fields__.keys())
        return cls(**{fields[i]: float(vec[i]) for i in range(len(fields))})

    @classmethod
    def param_names(cls):
        return list(cls.__dataclass_fields__.keys())

    def bounds(self):
        b = []
        for name in self.__dataclass_fields__:
            val = getattr(self, name)
            if name.startswith("tau_"):
                b.append((0.5, 100.0))
            elif name.startswith("alpha_"):
                b.append((0.0, 3.0))
            elif name.startswith("kappa_"):
                b.append((0.0, 1.0))
            elif name.startswith("load_scale_"):
                b.append((0.001, 0.5))
            elif name.startswith("mu_"):
                b.append((max(1, val * 0.3), val * 3.0))
            elif name.startswith("beta_"):
                b.append((-80, 80))
            elif name.startswith("sigma_"):
                b.append((0.1, 50.0))
            else:
                b.append((None, None))
        return b


# ─────────────────────────────────────────────
# 2. DAILY INPUT
# ─────────────────────────────────────────────

@dataclass
class DailyInput:
    day: int
    date: str = ""
    load_aerobic: float = 0.0
    load_neuromuscular: float = 0.0
    load_total: float = 0.0
    mental_load: float = 0.0
    sleep_quality: float = 1.0
    # Observable markers (None = not measured)
    hr_at_ref_power: Optional[float] = None
    hr_drift: Optional[float] = None
    core_temp_drift: Optional[float] = None
    power_decrement: Optional[float] = None
    set1_power: Optional[float] = None
    stroke_drift: Optional[float] = None
    rpe_residual: Optional[float] = None
    pvt_rt: Optional[float] = None
    hrv_rmssd: Optional[float] = None


# ─────────────────────────────────────────────
# 3. STATE DYNAMICS
# ─────────────────────────────────────────────

def state_step(state, inp, params, dt=1.0):
    """Advance latent state [f_a, f_n, f_c, w] by one day."""
    f_a, f_n, f_c, w = state

    L_a = inp.load_aerobic * params.load_scale_a
    L_n = inp.load_neuromuscular * params.load_scale_n
    L_c = inp.mental_load * params.load_scale_c
    L_w = inp.load_total * params.load_scale_w

    # State-dependent recovery (KEY NOVELTY)
    tau_a_eff = params.tau_a_off * (1.0 + params.alpha_a * max(f_a, 0))
    tau_n_eff = params.tau_n_off * (1.0 + params.alpha_n * max(f_n, 0))
    tau_c_eff = params.tau_c_off * (1.0 + params.alpha_c * max(f_c, 0))

    # Sleep modulates recovery
    sleep = max(inp.sleep_quality, 0.3)
    tau_a_eff /= sleep
    tau_n_eff /= sleep
    tau_c_eff /= sleep

    # ODEs
    df_a = L_a / params.tau_a_on - f_a / tau_a_eff + params.kappa_na * f_n
    df_n = L_n / params.tau_n_on - f_n / tau_n_eff + params.kappa_an * f_a
    df_c = L_c / params.tau_c_on - f_c / tau_c_eff + params.kappa_mc * inp.mental_load * params.load_scale_c
    dw = L_w / params.tau_w_on - w / params.tau_w_off

    new = state + dt * np.array([df_a, df_n, df_c, dw])
    new[:3] = np.maximum(new[:3], 0.0)
    new[3] = max(new[3], 0.0)
    return new


# ─────────────────────────────────────────────
# 4. OBSERVATION MODEL
# ─────────────────────────────────────────────

MARKER_SPECS = [
    ("hr_at_ref_power", "mu_hr_ref", "sigma_hr_ref",
     [(0, "beta_a_hr_ref"), (3, "beta_w_hr_ref")]),
    ("hr_drift", "mu_hr_drift", "sigma_hr_drift",
     [(0, "beta_a_hr_drift"), (1, "beta_n_hr_drift")]),
    ("core_temp_drift", "mu_temp_drift", "sigma_temp_drift",
     [(0, "beta_a_temp_drift")]),
    ("power_decrement", "mu_power_dec", "sigma_power_dec",
     [(1, "beta_n_power_dec"), (0, "beta_a_power_dec")]),
    ("set1_power", "mu_set1_power", "sigma_set1_power",
     [(1, "beta_n_set1_power"), (3, "beta_w_set1_power")]),
    ("stroke_drift", "mu_stroke_drift", "sigma_stroke_drift",
     [(1, "beta_n_stroke_drift")]),
    ("rpe_residual", "mu_rpe_residual", "sigma_rpe",
     [(2, "beta_c_rpe")]),
    ("pvt_rt", "mu_pvt", "sigma_pvt",
     [(2, "beta_c_pvt")]),
    ("hrv_rmssd", "mu_hrv", "sigma_hrv",
     [(0, "beta_a_hrv"), (2, "beta_c_hrv")]),
]


def predict_markers(state, params):
    pred = {}
    for name, mu_name, _, loadings in MARKER_SPECS:
        y = getattr(params, mu_name)
        for state_idx, beta_name in loadings:
            y += getattr(params, beta_name) * state[state_idx]
        pred[name] = y
    return pred


def obs_log_lik(inp, state, params):
    pred = predict_markers(state, params)
    ll = 0.0
    for name, _, sigma_name, _ in MARKER_SPECS:
        obs = getattr(inp, name, None)
        if obs is not None:
            sigma = getattr(params, sigma_name)
            ll += -0.5 * ((obs - pred[name]) / sigma) ** 2 - np.log(sigma)
    return ll


# ─────────────────────────────────────────────
# 5. SIMULATION
# ─────────────────────────────────────────────

def simulate(inputs, params, initial_state=None):
    N = len(inputs)
    state = np.zeros(4) if initial_state is None else initial_state.copy()
    states = np.zeros((N, 4))
    predictions = []
    total_ll = 0.0

    for i, inp in enumerate(inputs):
        states[i] = state
        predictions.append(predict_markers(state, params))
        total_ll += obs_log_lik(inp, state, params)
        state = state_step(state, inp, params)

    return {"states": states, "predictions": predictions, "log_likelihood": total_ll}


# ─────────────────────────────────────────────
# 6. PARAMETER ESTIMATION
# ─────────────────────────────────────────────

def log_prior(params):
    lp = 0.0
    default = FatigueModelParams()
    for name in FatigueModelParams.param_names():
        v = getattr(params, name)
        d = getattr(default, name)
        scale = max(abs(d) * 2.0, 1.0)
        lp += -0.5 * ((v - d) / scale) ** 2
    # Structural constraints
    if params.tau_a_on >= params.tau_a_off: lp -= 100
    if params.tau_n_on >= params.tau_n_off: lp -= 100
    if params.tau_c_on >= params.tau_c_off: lp -= 100
    return lp


def fit_model(inputs, initial_params=None, max_iter=500, fit_subset=None):
    if initial_params is None:
        initial_params = FatigueModelParams()

    all_names = FatigueModelParams.param_names()
    x0_full = initial_params.to_vector()
    bounds_full = initial_params.bounds()

    fit_indices = [all_names.index(n) for n in fit_subset] if fit_subset else list(range(len(all_names)))
    x0 = x0_full[fit_indices]
    bounds = [bounds_full[i] for i in fit_indices]

    def objective(x_sub):
        x_full = x0_full.copy()
        x_full[fit_indices] = x_sub
        try:
            p = FatigueModelParams.from_vector(x_full)
            r = simulate(inputs, p)
            return -(r["log_likelihood"] + log_prior(p))
        except:
            return 1e10

    print(f"  Fitting {len(fit_indices)} params over {len(inputs)} days...")
    result = minimize(objective, x0, method="L-BFGS-B", bounds=bounds,
                      options={"maxiter": max_iter, "disp": False})

    x_fitted = x0_full.copy()
    x_fitted[fit_indices] = result.x
    fitted = FatigueModelParams.from_vector(x_fitted)

    n_obs = sum(1 for inp in inputs for name, _, _, _ in MARKER_SPECS
                if getattr(inp, name, None) is not None)

    info = {
        "success": result.success, "n_iter": result.nit,
        "neg_log_post": float(result.fun),
        "n_params": len(fit_indices), "n_obs": n_obs,
    }
    if n_obs > 0:
        info["bic"] = len(fit_indices) * np.log(n_obs) + 2 * result.fun

    return fitted, info


# ─────────────────────────────────────────────
# 7. BANISTER BASELINE
# ─────────────────────────────────────────────

def fit_banister(inputs):
    def objective(p):
        p0, k1, k2, tau1, tau2 = p
        fitness, fatigue, ll = 0.0, 0.0, 0.0
        for inp in inputs:
            fitness = fitness * np.exp(-1.0 / max(tau1, 1)) + inp.load_total
            fatigue = fatigue * np.exp(-1.0 / max(tau2, 1)) + inp.load_total
            pred = p0 + k1 * fitness - k2 * fatigue
            if inp.set1_power is not None:
                ll += -0.5 * ((inp.set1_power - pred) / 10.0) ** 2
        return -ll

    res = differential_evolution(objective,
        bounds=[(100, 400), (0.01, 2.0), (0.01, 5.0), (10, 60), (2, 15)],
        maxiter=200, seed=42)
    return {"p0": res.x[0], "k1": res.x[1], "k2": res.x[2],
            "tau_fit": res.x[3], "tau_fat": res.x[4]}, -res.fun


# ─────────────────────────────────────────────
# 8. MODEL COMPARISON
# ─────────────────────────────────────────────

def compare_models(inputs):
    results = {}

    # M1: Banister
    bp, bll = fit_banister(inputs)
    results["M1_banister"] = {"desc": "2-state Banister (TrainingPeaks)", "k": 5, "ll": bll}

    # M2: 3-state, fixed recovery
    p2 = FatigueModelParams(alpha_a=0, alpha_n=0, alpha_c=0, kappa_mc=0)
    f2, i2 = fit_model(inputs, p2, fit_subset=[
        "tau_a_off", "tau_n_off", "tau_c_off",
        "beta_a_hr_ref", "beta_n_power_dec", "beta_n_set1_power", "beta_c_pvt",
        "mu_hr_ref", "mu_set1_power"])
    s2 = simulate(inputs, f2)
    results["M2_fixed_recovery"] = {"desc": "3-state, fixed recovery", "k": i2["n_params"],
                                     "ll": s2["log_likelihood"], "bic": i2.get("bic")}

    # M3: 3-state, state-dependent recovery
    p3 = FatigueModelParams(kappa_mc=0)
    f3, i3 = fit_model(inputs, p3, fit_subset=[
        "tau_a_off", "tau_n_off", "tau_c_off", "alpha_a", "alpha_n", "alpha_c",
        "beta_a_hr_ref", "beta_n_power_dec", "beta_n_set1_power", "beta_c_pvt",
        "mu_hr_ref", "mu_set1_power"])
    s3 = simulate(inputs, f3)
    results["M3_state_dependent"] = {
        "desc": "3-state, STATE-DEPENDENT recovery (novelty)",
        "k": i3["n_params"], "ll": s3["log_likelihood"], "bic": i3.get("bic"),
        "alpha_a": f3.alpha_a, "alpha_n": f3.alpha_n, "alpha_c": f3.alpha_c}

    # M4: Full model + mental load
    f4, i4 = fit_model(inputs, FatigueModelParams(), fit_subset=[
        "tau_a_off", "tau_n_off", "tau_c_off", "alpha_a", "alpha_n", "alpha_c",
        "kappa_mc", "beta_a_hr_ref", "beta_n_power_dec", "beta_n_set1_power",
        "beta_c_pvt", "beta_c_rpe", "mu_hr_ref", "mu_set1_power"])
    s4 = simulate(inputs, f4)
    results["M4_full_mental"] = {
        "desc": "3-state + mental load (full model)",
        "k": i4["n_params"], "ll": s4["log_likelihood"], "bic": i4.get("bic"),
        "kappa_mc": f4.kappa_mc}

    return results


# ─────────────────────────────────────────────
# 9. SYNTHETIC DATA GENERATOR
# ─────────────────────────────────────────────

def generate_synthetic(n_days=120, seed=42):
    rng = np.random.RandomState(seed)
    inputs = []

    for day in range(n_days):
        dow = day % 7
        cycle_week = (day // 7) % 4

        base_load = (80 + cycle_week * 30 if cycle_week < 3 else 40) + rng.normal(0, 15)
        if dow >= 5: base_load *= 0.5
        if rng.random() < 0.15: base_load = 0
        base_load = max(base_load, 0)

        aero_frac = {0: 0.4, 2: 0.6, 4: 0.8}.get(dow, 0.6)
        mental = min(5, max(1, (3.0 if dow < 5 else 1.5) + rng.normal(0, 0.5)))
        if (day // 7) in [3, 7, 11, 15]: mental = min(5, mental + 1.5)
        sleep = min(1.0, max(0.3, 0.85 + rng.normal(0, 0.1)))
        if mental > 4: sleep -= 0.15

        inputs.append(DailyInput(
            day=day, load_aerobic=base_load * aero_frac,
            load_neuromuscular=base_load * (1 - aero_frac),
            load_total=base_load, mental_load=mental, sleep_quality=sleep))

    # Generate observations from true model
    true_params = FatigueModelParams()
    true_result = simulate(inputs, true_params)

    for i, inp in enumerate(inputs):
        pred = true_result["predictions"][i]
        dow = i % 7
        if dow == 0 and inp.load_total > 20:
            inp.power_decrement = pred["power_decrement"] + rng.normal(0, true_params.sigma_power_dec)
            inp.set1_power = pred["set1_power"] + rng.normal(0, true_params.sigma_set1_power)
            inp.stroke_drift = pred["stroke_drift"] + rng.normal(0, true_params.sigma_stroke_drift)
        if dow == 2 and inp.load_total > 20:
            inp.hr_at_ref_power = pred["hr_at_ref_power"] + rng.normal(0, true_params.sigma_hr_ref)
            inp.core_temp_drift = pred["core_temp_drift"] + rng.normal(0, true_params.sigma_temp_drift)
        if dow == 4 and inp.load_total > 20:
            inp.hr_drift = pred["hr_drift"] + rng.normal(0, true_params.sigma_hr_drift)
        if rng.random() < 0.85:
            inp.hrv_rmssd = pred["hrv_rmssd"] + rng.normal(0, true_params.sigma_hrv)
        if inp.load_total > 20:
            inp.rpe_residual = pred["rpe_residual"] + rng.normal(0, true_params.sigma_rpe)
        if rng.random() < 0.6:
            inp.pvt_rt = pred["pvt_rt"] + rng.normal(0, true_params.sigma_pvt)

    return inputs, true_params, true_result


# ─────────────────────────────────────────────
# 10. MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 70)
    print("  MULTI-TIMESCALE FATIGUE STATE-SPACE MODEL")
    print("=" * 70)

    print("\n▸ Generating 120-day synthetic training block...")
    inputs, true_params, true_result = generate_synthetic(120)

    n_obs = sum(1 for inp in inputs for n, _, _, _ in MARKER_SPECS
                if getattr(inp, n, None) is not None)
    print(f"  {len(inputs)} days, {n_obs} observations")

    states = true_result["states"]
    print(f"\n▸ True state trajectories:")
    for i, name in enumerate(["f_aerobic", "f_neuromuscular", "f_central", "fitness"]):
        print(f"    {name:20s}: [{states[:,i].min():.3f} — {states[:,i].max():.3f}]  μ={states[:,i].mean():.3f}")

    # Fit from perturbed start
    print(f"\n▸ Fitting model from perturbed start...")
    perturbed = FatigueModelParams(tau_a_off=10.0, tau_n_off=3.0, alpha_a=0.2, alpha_n=0.3)
    fitted, info = fit_model(inputs, perturbed, max_iter=500, fit_subset=[
        "tau_a_off", "tau_n_off", "tau_c_off",
        "alpha_a", "alpha_n", "alpha_c", "kappa_mc",
        "beta_a_hr_ref", "beta_a_hr_drift", "beta_n_power_dec",
        "beta_n_set1_power", "beta_c_pvt", "mu_hr_ref", "mu_set1_power"])

    print(f"\n  {'Converged' if info['success'] else 'Not converged'} in {info['n_iter']} iterations")

    print(f"\n▸ Parameter recovery (dynamics):")
    print(f"  {'Parameter':<20s} {'True':>8s} {'Fitted':>8s} {'Error':>8s}")
    print(f"  {'─'*20} {'─'*8} {'─'*8} {'─'*8}")
    for name in ["tau_a_off", "tau_n_off", "tau_c_off", "alpha_a", "alpha_n", "alpha_c", "kappa_mc"]:
        t, f = getattr(true_params, name), getattr(fitted, name)
        print(f"  {name:<20s} {t:>8.3f} {f:>8.3f} {abs(f-t):>8.3f}")

    # Model comparison
    print(f"\n▸ Model comparison...")
    comp = compare_models(inputs)

    print(f"\n  {'Model':<25s} {'Params':>7s} {'Log-lik':>10s} {'BIC':>10s}")
    print(f"  {'─'*25} {'─'*7} {'─'*10} {'─'*10}")
    for name, r in comp.items():
        bic = f"{r['bic']:.1f}" if r.get('bic') else "N/A"
        print(f"  {name:<25s} {r['k']:>7d} {r['ll']:>10.1f} {bic:>10s}")

    if "alpha_a" in comp.get("M3_state_dependent", {}):
        m3 = comp["M3_state_dependent"]
        print(f"\n  M3 recovered α: aerobic={m3['alpha_a']:.2f}, neuro={m3['alpha_n']:.2f}, central={m3['alpha_c']:.2f}")
    if "kappa_mc" in comp.get("M4_full_mental", {}):
        print(f"  M4 recovered κ_mc: {comp['M4_full_mental']['kappa_mc']:.3f}")

    # Save
    output = {
        "parameter_recovery": {
            name: {"true": getattr(true_params, name), "fitted": getattr(fitted, name)}
            for name in ["tau_a_off", "tau_n_off", "tau_c_off", "alpha_a", "alpha_n", "alpha_c", "kappa_mc"]
        },
        "model_comparison": {k: {kk: vv for kk, vv in v.items()} for k, v in comp.items()},
    }
    with open("model_results.json", "w") as f:
        json.dump(output, f, indent=2, default=str)
    print(f"\n✓ Saved to model_results.json")
