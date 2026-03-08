import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { HeroPanel } from "@/components/HeroPanel";
import { Screen } from "@/components/Screen";
import { SectionTitle } from "@/components/SectionTitle";
import { MODEL_ARCHITECTURE, MODEL_EQUATIONS, MODEL_RESULTS } from "@/lib/model-viz-data";
import { theme } from "@/lib/theme";

type TabKey = "architecture" | "equations" | "results" | "questions";

const tabs: { id: TabKey; label: string }[] = [
  { id: "architecture", label: "Architecture" },
  { id: "equations", label: "Equations" },
  { id: "results", label: "Results" },
  { id: "questions", label: "Research" },
];

function parameterGroupLabel(name: string) {
  if (name.startsWith("tau_")) return "Recovery time constants";
  if (name.startsWith("alpha_")) return "State dependence";
  if (name.startsWith("kappa_")) return "Cross-talk coupling";
  if (name.startsWith("beta_")) return "Observation loadings";
  if (name.startsWith("mu_")) return "Observation baselines";
  if (name.startsWith("sigma_")) return "Measurement noise";
  return "Other parameters";
}

export default function ModelScreen() {
  const [tab, setTab] = useState<TabKey>("architecture");

  return (
    <Screen>
      <HeroPanel
        eyebrow="Model"
        title="Four latent states, nine observable markers, one interpretable readiness engine."
        detail="This screen is the mobile adaptation of the stronger model visuals in science/files. It shows what the app is actually estimating."
        tone="plum"
      />

      <View style={styles.tabRow}>
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.tabButton, active && styles.tabButtonActive]}
              onPress={() => setTab(item.id)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === "architecture" ? <ArchitectureView /> : null}
      {tab === "equations" ? <EquationView /> : null}
      {tab === "results" ? <ResultsView /> : null}
      {tab === "questions" ? <QuestionsView /> : null}
    </Screen>
  );
}

function ArchitectureView() {
  return (
    <>
      <SectionTitle title="Daily inputs" detail="These are the channels that drive the latent state update each day." />
      <Card>
        {MODEL_ARCHITECTURE.inputs.map((item) => (
          <InfoRow key={item.name} title={item.name} detail={item.source} color={item.color} />
        ))}
      </Card>

      <SectionTitle title="Hidden states" detail="The model assumes fatigue is not one thing. These states evolve together and project onto the measured markers." />
      <Card tone="muted">
        {MODEL_ARCHITECTURE.states.map((item) => (
          <InfoRow key={item.name} title={`${item.name} — ${item.label}`} detail={item.meta} color={item.color} />
        ))}
      </Card>

      <SectionTitle title="Observation markers" detail="Each marker is a noisy projection of one or more latent states." />
      <Card>
        {MODEL_ARCHITECTURE.markers.map((item) => (
          <InfoRow key={item.name} title={item.name} detail={`${item.states} · ${item.session}`} color={item.color} />
        ))}
      </Card>
    </>
  );
}

function EquationView() {
  return (
    <>
      <SectionTitle title="State dynamics" detail="These equations are the actual conceptual core of the model coming from science/files." />
      {MODEL_EQUATIONS.map((item) => (
        <Card key={item.label} tone={item.novel ? "accent" : "default"}>
          <View style={styles.equationHeader}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <Text style={styles.equationTitle}>{item.label}</Text>
            {item.novel ? <Text style={styles.novel}>Novel</Text> : null}
          </View>
          <Text style={styles.equationText}>{item.eq}</Text>
        </Card>
      ))}
      <Card tone="muted">
        <Text style={styles.bodyText}>
          The key scientific claim here is that recovery slows as fatigue accumulates. That is the part current consumer tools generally flatten into a constant recovery rate.
        </Text>
      </Card>
    </>
  );
}

function ResultsView() {
  const bicRows = MODEL_RESULTS.modelComparison.filter((item) => item.bic !== null);
  const maxBic = Math.max(...bicRows.map((item) => item.bic ?? 0));
  const groupedRecovery = MODEL_RESULTS.paramRecovery.reduce<Record<string, typeof MODEL_RESULTS.paramRecovery>>((acc, item) => {
    const group = parameterGroupLabel(item.name);
    acc[group] = acc[group] ?? [];
    acc[group].push(item);
    return acc;
  }, {});

  return (
    <>
      <SectionTitle title="Parameter recovery" detail="Synthetic 120-day results from the science/files visualization, adapted for mobile." />
      {Object.entries(groupedRecovery).map(([group, items]) => (
        <Card key={group}>
          <Text style={styles.groupTitle}>{group}</Text>
          {items.map((item) => {
            const error = Math.abs(item.fitted - item.true);
            return (
              <View key={item.name} style={styles.metricBlock}>
                <Text style={styles.metricTitle}>{item.name}</Text>
                <Text style={styles.metricDetail}>{item.desc}</Text>
                <View style={styles.metricNumbers}>
                  <MetricPill label="True" value={item.true.toFixed(2)} />
                  <MetricPill label="Fitted" value={item.fitted.toFixed(2)} />
                  <MetricPill label="Error" value={error.toFixed(2)} tone={error < 0.3 ? "positive" : "alert"} />
                </View>
              </View>
            );
          })}
        </Card>
      ))}

      <SectionTitle title="Model comparison" detail="Lower BIC is better. The main question is whether state-dependent recovery earns its extra complexity." />
      <Card tone="muted">
        {bicRows.map((item) => {
          const width = `${((item.bic ?? 0) / maxBic) * 100}%` as const;
          return (
            <View key={item.id} style={styles.barWrap}>
              <View style={styles.barLabelRow}>
                <Text style={[styles.barId, { color: item.color }]}>{item.id}</Text>
                <Text style={styles.barName}>{item.name}</Text>
                <Text style={styles.barValue}>{item.bic}</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width, backgroundColor: item.color }]} />
              </View>
              <Text style={styles.barDetail}>{item.desc}</Text>
            </View>
          );
        })}
      </Card>

      <Card tone="accent">
        <Text style={styles.bodyText}>
          Key finding: the state-dependent model sharply outperforms fixed recovery in synthetic data. The mental-load extension is plausible, but its gain depends on real variation in work-stress and cognitive load.
        </Text>
      </Card>
    </>
  );
}

function QuestionsView() {
  return (
    <>
      <SectionTitle title="Research questions" detail="These are the actual hypotheses the app and pipeline are structured to answer." />
      {MODEL_RESULTS.hypotheses.map((item) => (
        <Card key={item.q}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionTitle}>{item.q}</Text>
            <View style={[styles.statusChip, { backgroundColor: `${item.color}20` }]}>
              <Text style={[styles.statusText, { color: item.color }]}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.questionMeta}>Test: {item.test}</Text>
          <Text style={[styles.questionResult, { color: item.color }]}>Result: {item.result}</Text>
        </Card>
      ))}
    </>
  );
}

function InfoRow({ title, detail, color }: { title: string; detail: string; color: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.colorDot, { backgroundColor: color }]} />
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function MetricPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "alert";
}) {
  const backgroundColor =
    tone === "positive"
      ? theme.colors.successBg
      : tone === "alert"
        ? theme.colors.warnBg
        : theme.colors.surfaceMuted;
  const color =
    tone === "positive"
      ? theme.colors.accentForest
      : tone === "alert"
        ? theme.colors.accentWarm
        : theme.colors.text;

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  tabTextActive: {
    color: theme.colors.white,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 5,
  },
  infoCopy: {
    flex: 1,
    gap: 3,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  infoDetail: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  equationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  equationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
  },
  novel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.accentWarm,
    textTransform: "uppercase",
  },
  equationText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  bodyText: {
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  metricBlock: {
    gap: 6,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.text,
  },
  metricDetail: {
    color: theme.colors.textMuted,
  },
  metricNumbers: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  pill: {
    minWidth: 84,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  pillLabel: {
    fontSize: 11,
    color: theme.colors.textSoft,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  pillValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  barWrap: {
    gap: 6,
    marginBottom: 14,
  },
  barLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barId: {
    width: 28,
    fontWeight: "800",
  },
  barName: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: "700",
  },
  barValue: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  barTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#e6ddcf",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  barDetail: {
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  questionTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: theme.colors.text,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  questionMeta: {
    marginTop: 10,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  questionResult: {
    marginTop: 8,
    lineHeight: 20,
    fontWeight: "700",
  },
});
