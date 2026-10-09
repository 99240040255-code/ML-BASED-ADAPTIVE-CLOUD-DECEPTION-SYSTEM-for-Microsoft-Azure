import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BrainCircuit,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Cloud,
  Crosshair,
  Database,
  FileSearch,
  Filter,
  Gauge,
  KeyRound,
  LayoutDashboard,
  Lock,
  Menu,
  MoreHorizontal,
  Network,
  Radio,
  RotateCw,
  ScanLine,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Terminal,
  User,
  Wifi,
  X,
  Zap,
} from "@/lib/lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Severity = "critical" | "high" | "medium" | "low";
type ViewKey = "overview" | "decoys" | "threats" | "policy";

interface Metric {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: "cyan" | "amber" | "red" | "green" | "purple";
}

interface ThreatAlert {
  id: string;
  title: string;
  source: string;
  technique: string;
  severity: Severity;
  score: number;
  confidence: number;
  observed_at: string;
  description: string;
  status: "active" | "investigating" | "contained";
  asset: string;
}

interface Decoy {
  id: string;
  name: string;
  type: string;
  status: "healthy" | "degraded" | "rotating";
  region: string;
  interaction_count: number;
  coverage: number;
  adaptive_level: string;
  last_rotated: string;
}

interface ActivityItem {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  source: string;
  severity: Severity;
}

interface Policy {
  bait_ratio: number;
  decoy_density: number;
  auto_rotate: boolean;
  quarantine_threshold: number;
  updated_at: string;
}

interface Technique {
  name: string;
  id: string;
  count: number;
  intensity: string;
}

interface DashboardSnapshot {
  model_version: string;
  environment: string;
  updated_at: string;
  metrics: Metric[];
  alerts: ThreatAlert[];
  decoys: Decoy[];
  activity: ActivityItem[];
  policy: Policy;
  techniques: Technique[];
}

interface ActionResponse {
  action: string;
  status: string;
  message: string;
  updated_alert_id?: string | null;
}

const fallbackSnapshot: DashboardSnapshot = {
  model_version: "ADAPT-ML v2.4.1",
  environment: "AZURE-SIM-EASTUS-01",
  updated_at: "2025-03-08T14:32:18Z",
  metrics: [
    { id: "active-threats", label: "Active threats", value: "07", delta: "+2 today", tone: "red" },
    { id: "decoy-coverage", label: "Decoy coverage", value: "86.4%", delta: "+4.8%", tone: "cyan" },
    { id: "model-confidence", label: "Model confidence", value: "94.7%", delta: "+1.2%", tone: "purple" },
    { id: "interactions-24h", label: "Interactions / 24h", value: "1,284", delta: "+18.6%", tone: "amber" },
  ],
  alerts: [
    { id: "ALT-2048", title: "Token replay against Entra twin", source: "185.73.44.19", technique: "T1078 · Valid Accounts", severity: "critical", score: 96, confidence: 98, observed_at: "2m ago", description: "A replayed service principal token reached a high-value M365 digital twin after a failed Key Vault probe.", status: "active", asset: "entra-twin-finance" },
    { id: "ALT-2045", title: "Burst authentication on SSH lure", source: "45.148.10.92", technique: "T1110 · Brute Force", severity: "high", score: 82, confidence: 91, observed_at: "11m ago", description: "Credential spray pattern matched an autonomous scanner profile across three Cowrie sensors.", status: "investigating", asset: "vm-ops-honeypot-03" },
    { id: "ALT-2039", title: "PowerShell discovery chain", source: "20.219.77.11", technique: "T1059.001 · PowerShell", severity: "medium", score: 64, confidence: 87, observed_at: "28m ago", description: "A scripted discovery sequence enumerated fake subscriptions and stopped at a seeded storage lure.", status: "active", asset: "storage-vault-payroll" },
  ],
  decoys: [
    { id: "D-001", name: "entra-twin-finance", type: "Entra ID twin", status: "healthy", region: "East US", interaction_count: 428, coverage: 94, adaptive_level: "Aggressive", last_rotated: "18m ago" },
    { id: "D-002", name: "vm-ops-honeypot-03", type: "VM / Cowrie SSH", status: "healthy", region: "West Europe", interaction_count: 312, coverage: 88, adaptive_level: "Balanced", last_rotated: "42m ago" },
    { id: "D-003", name: "storage-vault-payroll", type: "Blob + Key Vault lure", status: "degraded", region: "Central US", interaction_count: 207, coverage: 76, adaptive_level: "Observant", last_rotated: "2h ago" },
    { id: "D-004", name: "m365-admin-portal", type: "M365 digital twin", status: "healthy", region: "North Europe", interaction_count: 166, coverage: 91, adaptive_level: "Balanced", last_rotated: "1h ago" },
  ],
  activity: [
    { id: "ACT-01", timestamp: "14:32:18", event: "Token replay intercepted", actor: "185.73.44.19", source: "entra-twin-finance", severity: "critical" },
    { id: "ACT-02", timestamp: "14:29:06", event: "Decoy credential rotated", actor: "ADAPT-ML", source: "vm-ops-honeypot-03", severity: "low" },
    { id: "ACT-03", timestamp: "14:26:41", event: "PowerShell cmdlet captured", actor: "20.219.77.11", source: "storage-vault-payroll", severity: "medium" },
    { id: "ACT-04", timestamp: "14:22:19", event: "Impossible travel detected", actor: "svc-backup-admin", source: "m365-admin-portal", severity: "high" },
    { id: "ACT-05", timestamp: "14:17:52", event: "New scanner fingerprint", actor: "45.148.10.92", source: "vm-ops-honeypot-03", severity: "medium" },
  ],
  policy: { bait_ratio: 72, decoy_density: 68, auto_rotate: true, quarantine_threshold: 88, updated_at: "Today, 14:18 UTC" },
  techniques: [
    { name: "Valid Accounts", id: "T1078", count: 18, intensity: "critical" },
    { name: "Brute Force", id: "T1110", count: 12, intensity: "high" },
    { name: "PowerShell", id: "T1059.001", count: 9, intensity: "medium" },
    { name: "Cloud Service Dashboard", id: "T1538", count: 6, intensity: "low" },
    { name: "Permission Groups Discovery", id: "T1069", count: 8, intensity: "medium" },
    { name: "Credentials from Password Stores", id: "T1555", count: 4, intensity: "low" },
  ],
};

const navItems: Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard; count?: string }> = [
  { key: "overview", label: "Threat overview", icon: LayoutDashboard },
  { key: "decoys", label: "Adaptive decoys", icon: Boxes, count: "12" },
  { key: "threats", label: "Threat monitor", icon: Activity, count: "07" },
  { key: "policy", label: "Policy tuning", icon: SlidersHorizontal },
];

const severityClass: Record<Severity, string> = {
  critical: "severity-critical",
  high: "severity-high",
  medium: "severity-medium",
  low: "severity-low",
};

function SectionEyebrow({ children }: { children: string }) {
  return <div data-testid="section-eyebrow" className="section-eyebrow"><span className="eyebrow-line" />{children}</div>;
}

function StatusDot({ severity = "low" }: { severity?: Severity }) {
  return <span data-testid={`status-dot-${severity}`} className={`status-dot ${severityClass[severity]}`} />;
}

function MiniSpark({ tone }: { tone: Metric["tone"] }) {
  const stroke = { cyan: "#00e5ff", red: "#ff5b63", purple: "#b175ff", amber: "#ffb14a", green: "#20d69a" }[tone];
  return <svg data-testid={`metric-spark-${tone}`} className="metric-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22 L10 19 L19 21 L29 12 L38 16 L48 8 L58 14 L69 5 L78 11 L87 7 L100 2" fill="none" stroke={stroke} strokeWidth="2" /></svg>;
}

function Overview({ data, onInvestigate, onNavigate }: { data: DashboardSnapshot; onInvestigate: (alert: ThreatAlert) => void; onNavigate: (view: ViewKey) => void }) {
  return (
    <div data-testid="overview-view" className="view-stack">
      <div className="view-heading-row">
        <div>
          <SectionEyebrow>COMMAND CENTER / LIVE TELEMETRY</SectionEyebrow>
          <h1 data-testid="overview-page-title" className="page-title">Threat topology <span>&amp; deception map</span></h1>
          <p data-testid="overview-page-description" className="page-subtitle">Adaptive coverage across simulated Azure workloads, weighted by ML anomaly confidence.</p>
        </div>
        <div className="heading-actions"><Button data-testid="refresh-telemetry-button" variant="outline" className="tactical-button" onClick={() => toast.success("Telemetry stream synchronized", { description: "Simulation window refreshed just now." })}><RotateCw size={15} /> Sync stream</Button><Button data-testid="simulate-threat-button" className="primary-button" onClick={() => toast.info("Synthetic threat queued", { description: "The next event will appear in the simulated activity feed." })}><Zap size={15} /> Simulate event</Button></div>
      </div>

      <div className="metric-grid" data-testid="overview-metrics-grid">
        {data.metrics.map((metric) => <div data-testid={`metric-card-${metric.id}`} className={`metric-card tone-${metric.tone}`} key={metric.id}><div className="metric-top"><span data-testid={`metric-label-${metric.id}`} className="metric-label">{metric.label}</span><ArrowUpRight size={14} /></div><div className="metric-value" data-testid={`metric-value-${metric.id}`}>{metric.value}</div><div className="metric-bottom"><span data-testid={`metric-delta-${metric.id}`} className="metric-delta">{metric.delta}</span><MiniSpark tone={metric.tone} /></div></div>)}
      </div>

      <div className="dashboard-grid top-grid">
        <div className="panel topology-panel" data-testid="azure-topology-panel">
          <div className="panel-header"><div><SectionEyebrow>SIMULATED AZURE ENVIRONMENT</SectionEyebrow><h2 data-testid="topology-panel-title" className="panel-title">Deception topology</h2></div><Badge data-testid="topology-status-badge" className="live-badge"><span className="pulse-dot" /> 12 sensors online</Badge></div>
          <div className="topology-canvas" data-testid="topology-canvas"><div className="topology-grid-lines" /><div className="topology-ring ring-one" /><div className="topology-ring ring-two" /><div className="topology-core"><Shield size={27} /><span>ADAPT<br /><b>ML CORE</b></span></div><div className="topology-node node-entra"><span className="node-icon blue"><Cloud size={16} /></span><span><b>Entra ID twin</b><small>East US · 4 lures</small></span><StatusDot severity="critical" /></div><div className="topology-node node-vm"><span className="node-icon cyan"><Server size={16} /></span><span><b>VM honeypots</b><small>West Europe · 3 active</small></span><StatusDot severity="low" /></div><div className="topology-node node-vault"><span className="node-icon amber"><KeyRound size={16} /></span><span><b>Key Vault lure</b><small>Central US · degraded</small></span><StatusDot severity="medium" /></div><div className="topology-node node-m365"><span className="node-icon purple"><Network size={16} /></span><span><b>M365 digital twin</b><small>North Europe · healthy</small></span><StatusDot severity="low" /></div><div className="scan-line" /></div>
          <div className="topology-footer"><span data-testid="topology-coverage-copy"><CheckCircle2 size={14} /> Coverage is within target</span><span data-testid="topology-last-update">Last model update 14:32:18 UTC</span></div>
        </div>

        <div className="panel confidence-panel" data-testid="ml-confidence-panel"><div className="panel-header"><div><SectionEyebrow>ADAPT-ML / ANOMALY ENGINE</SectionEyebrow><h2 className="panel-title">Confidence signal</h2></div><BrainCircuit size={19} className="panel-icon purple-icon" /></div><div className="confidence-body"><div className="confidence-gauge"><div className="gauge-inner"><span data-testid="ml-confidence-score-badge">94.7<span>%</span></span><small>model confidence</small></div></div><div className="confidence-copy"><div className="confidence-state"><span className="pulse-dot purple-pulse" />HIGH FIDELITY</div><p data-testid="confidence-explanation">The model is separating automated discovery from human-led intrusion with high certainty.</p><div className="weight-row"><span>Behavioral deviation</span><b>0.41</b><i><em style={{ width: "82%" }} /></i></div><div className="weight-row"><span>Identity risk</span><b>0.29</b><i><em style={{ width: "58%" }} /></i></div><div className="weight-row"><span>Asset criticality</span><b>0.24</b><i><em style={{ width: "48%" }} /></i></div></div></div><button data-testid="open-model-details-button" className="panel-link" onClick={() => onNavigate("policy")}>View feature weights <ChevronRight size={14} /></button></div>
      </div>

      <div className="dashboard-grid lower-grid">
        <div className="panel alerts-panel" data-testid="threat-alerts-panel"><div className="panel-header"><div><SectionEyebrow>PRIORITIZED BY RISK SCORE</SectionEyebrow><h2 className="panel-title">Threat queue</h2></div><button data-testid="view-all-threats-button" className="text-button" onClick={() => onNavigate("threats")}>View all <ArrowUpRight size={14} /></button></div><div className="alert-list">{data.alerts.map((alert) => <button type="button" data-testid={`threat-alert-card-${alert.id.toLowerCase()}`} className="alert-row" key={alert.id} onClick={() => onInvestigate(alert)}><div className={`alert-severity-bar ${severityClass[alert.severity]}`} /><div className="alert-main"><div className="alert-title-line"><StatusDot severity={alert.severity} /><strong>{alert.title}</strong><Badge data-testid={`alert-severity-badge-${alert.id.toLowerCase()}`} className={`severity-badge ${severityClass[alert.severity]}`}>{alert.severity}</Badge></div><div className="alert-meta"><span>{alert.id}</span><span>{alert.source}</span><span>{alert.technique}</span></div></div><div className="alert-score"><strong>{alert.score}</strong><small>risk</small></div><div className="alert-time">{alert.observed_at}<ChevronRight size={15} /></div></button>)}</div></div>
        <div className="panel activity-panel" data-testid="activity-feed-panel"><div className="panel-header"><div><SectionEyebrow>EVENT STREAM / 24H</SectionEyebrow><h2 className="panel-title">Live activity</h2></div><span className="stream-status"><Radio size={13} /> Streaming</span></div><div className="activity-list">{data.activity.map((item) => <div data-testid={`activity-event-${item.id.toLowerCase()}`} className="activity-row" key={item.id}><div className="activity-time">{item.timestamp}</div><div className="activity-marker"><StatusDot severity={item.severity} /></div><div className="activity-copy"><strong>{item.event}</strong><span>{item.actor} <b>→</b> {item.source}</span></div></div>)}</div><div className="terminal-strip"><Terminal size={13} /><span>event_bus://adaptive-simulation</span><i>CONNECTED</i></div></div>
      </div>
    </div>
  );
}

function DecoyInventory({ data, onRotate }: { data: DashboardSnapshot; onRotate: () => void }) {
  return <div data-testid="decoys-view" className="view-stack"><div className="view-heading-row"><div><SectionEyebrow>RESOURCE CONTROL / DECEPTION FABRIC</SectionEyebrow><h1 className="page-title">Adaptive decoy <span>inventory</span></h1><p className="page-subtitle">Manage synthetic identities, compute lures, and vault baits across the simulated tenant.</p></div><Button data-testid="deploy-simulated-decoy-button" className="primary-button" onClick={() => toast.success("Decoy deployment staged", { description: "A new adaptive lure is ready for simulation." })}><Boxes size={15} /> Deploy decoy</Button></div><div className="inventory-summary"><div className="inventory-summary-card"><span className="metric-label">ACTIVE DECOYS</span><strong data-testid="active-decoys-count">12</strong><span>across 4 regions</span></div><div className="inventory-summary-card"><span className="metric-label">INTERACTION RATE</span><strong>+18.6%</strong><span className="positive-copy">vs previous window</span></div><div className="inventory-summary-card"><span className="metric-label">ROTATION QUEUE</span><strong>03</strong><span className="warning-copy">adaptive review</span></div></div><div className="panel table-panel"><div className="panel-header"><div><SectionEyebrow>ALL SYNTHETIC ASSETS</SectionEyebrow><h2 className="panel-title">Decoy health matrix</h2></div><div className="table-actions"><button data-testid="decoy-filter-button" className="icon-button"><Filter size={15} /></button><Button data-testid="rotate-all-decoys-button" variant="outline" className="tactical-button" onClick={onRotate}><RotateCw size={14} /> Rotate degraded</Button></div></div><div className="table-wrap"><table data-testid="decoy-inventory-table"><thead><tr><th>Asset</th><th>Type</th><th>Region</th><th>Health</th><th>Interactions</th><th>Coverage</th><th>Last rotation</th><th /></tr></thead><tbody>{data.decoys.map((decoy) => <tr key={decoy.id} data-testid={`decoy-row-${decoy.id.toLowerCase()}`}><td><div className="asset-cell"><span className="table-icon"><Server size={15} /></span><span><strong>{decoy.name}</strong><small>{decoy.id} · {decoy.adaptive_level}</small></span></div></td><td>{decoy.type}</td><td>{decoy.region}</td><td><span className={`health-state ${decoy.status}`}><span className="status-dot" />{decoy.status}</span></td><td className="mono-cell">{decoy.interaction_count}</td><td><div className="coverage-cell"><span>{decoy.coverage}%</span><i><em style={{ width: `${decoy.coverage}%` }} /></i></div></td><td>{decoy.last_rotated}</td><td><button data-testid={`decoy-actions-${decoy.id.toLowerCase()}`} className="icon-button"><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table></div></div></div>;
}

function ThreatMonitor({ data, onInvestigate }: { data: DashboardSnapshot; onInvestigate: (alert: ThreatAlert) => void }) {
  return <div data-testid="threats-view" className="view-stack"><div className="view-heading-row"><div><SectionEyebrow>DETECTION ENGINE / MITRE ATT&amp;CK</SectionEyebrow><h1 className="page-title">Threat event <span>monitor</span></h1><p className="page-subtitle">Replay, filter, and investigate attacker behavior captured by the deception fabric.</p></div><div className="heading-actions"><button data-testid="threat-time-range-button" className="filter-button"><Circle size={8} fill="currentColor" /> Last 24 hours <ChevronRight size={14} /></button><button data-testid="threat-filter-button" className="filter-button"><Filter size={14} /> Filter</button></div></div><div className="dashboard-grid threat-grid"><div className="panel matrix-panel"><div className="panel-header"><div><SectionEyebrow>TACTIC INTENSITY</SectionEyebrow><h2 className="panel-title">ATT&amp;CK technique matrix</h2></div><ScanLine size={18} className="panel-icon" /></div><div className="technique-list">{data.techniques.map((technique) => <button type="button" data-testid={`technique-${technique.id.toLowerCase().replace(".", "-")}`} className="technique-row" key={technique.id}><span className={`technique-heat ${severityClass[technique.intensity as Severity]}`} /><span><strong>{technique.name}</strong><small>{technique.id}</small></span><b>{technique.count}</b><ChevronRight size={14} /></button>)}</div></div><div className="panel event-replay-panel"><div className="panel-header"><div><SectionEyebrow>SESSION REPLAY / ALT-2048</SectionEyebrow><h2 className="panel-title">Captured sequence</h2></div><Badge className="severity-badge severity-critical">CRITICAL</Badge></div><div className="replay-track"><div className="replay-line" /><div className="replay-step complete"><span>01</span><div><b>Initial access</b><small>Service token presented</small></div></div><div className="replay-step complete"><span>02</span><div><b>Discovery</b><small>Key Vault names enumerated</small></div></div><div className="replay-step current"><span>03</span><div><b>Credential access</b><small>Replay detected at M365 twin</small></div></div><div className="replay-step pending"><span>04</span><div><b>Containment</b><small>Awaiting analyst decision</small></div></div></div><button data-testid="investigate-replay-button" className="panel-link" onClick={() => onInvestigate(data.alerts[0])}>Open incident deep dive <ArrowUpRight size={14} /></button></div></div><div className="panel full-stream-panel"><div className="panel-header"><div><SectionEyebrow>RAW TELEMETRY</SectionEyebrow><h2 className="panel-title">Attacker payload inspector</h2></div><span className="stream-status"><Wifi size={13} /> live tail</span></div><div className="code-log" data-testid="attacker-payload-log"><div><span className="log-time">14:32:18</span><span className="log-key">SRC</span><span className="log-value">185.73.44.19</span><span className="log-muted">POST /oauth2/token</span></div><div><span className="log-time">14:32:19</span><span className="log-key amber-text">ML</span><span className="log-value">confidence=0.98</span><span className="log-muted">identity_replay=true</span></div><div><span className="log-time">14:32:20</span><span className="log-key red-text">ACT</span><span className="log-value">T1078 / T1555</span><span className="log-muted">synthetic_session_isolated</span></div><div><span className="log-time">14:32:21</span><span className="log-key green-text">DECOY</span><span className="log-value">m365-admin-portal</span><span className="log-muted">response_profile=observe</span></div></div></div></div>;
}

function PolicyTuning({ data, onSave }: { data: DashboardSnapshot; onSave: (policy: Policy) => void }) {
  const [policy, setPolicy] = useState(data.policy);
  const setNumber = (key: "bait_ratio" | "decoy_density" | "quarantine_threshold", value: number) => setPolicy((current) => ({ ...current, [key]: value }));
  return <div data-testid="policy-view" className="view-stack"><div className="view-heading-row"><div><SectionEyebrow>CONTROL PLANE / ADAPT-ML</SectionEyebrow><h1 className="page-title">Deception policy <span>auto-tuning</span></h1><p className="page-subtitle">Tune how aggressively the model learns from attacker behavior and reshapes the bait surface.</p></div><div className="policy-state"><span className="pulse-dot" /> POLICY ENGINE ACTIVE</div></div><div className="dashboard-grid policy-grid"><div className="panel policy-controls"><div className="panel-header"><div><SectionEyebrow>SIMULATION SANDBOX</SectionEyebrow><h2 className="panel-title">Adaptive controls</h2></div><Settings size={18} className="panel-icon" /></div><div className="control-stack"><PolicySlider dataTestId="policy-bait-ratio-slider" label="Bait ratio" description="Synthetic secrets mixed into realistic resources" value={policy.bait_ratio} onChange={(value) => setNumber("bait_ratio", value)} /><PolicySlider dataTestId="policy-decoy-density-slider" label="Decoy density" description="Lure coverage across the simulated tenant" value={policy.decoy_density} onChange={(value) => setNumber("decoy_density", value)} /><PolicySlider dataTestId="policy-quarantine-threshold-slider" label="Quarantine threshold" description="Risk score required to auto-isolate a session" value={policy.quarantine_threshold} onChange={(value) => setNumber("quarantine_threshold", value)} /><div className="toggle-row"><div><strong>Auto-rotate compromised lures</strong><small>Let the model replace exposed credentials</small></div><button type="button" data-testid="policy-auto-rotate-toggle" aria-pressed={policy.auto_rotate} className={`toggle ${policy.auto_rotate ? "active" : ""}`} onClick={() => setPolicy((current) => ({ ...current, auto_rotate: !current.auto_rotate }))}><span /></button></div></div><div className="policy-footer"><span>Last updated {data.policy.updated_at}</span><Button data-testid="save-policy-button" className="primary-button" onClick={() => onSave(policy)}><Check size={15} /> Save policy</Button></div></div><div className="panel predictor-panel"><div className="panel-header"><div><SectionEyebrow>IMPACT PREDICTOR</SectionEyebrow><h2 className="panel-title">Projected response</h2></div><Gauge size={19} className="panel-icon purple-icon" /></div><div className="predictor-score"><span>Expected capture lift</span><strong data-testid="projected-capture-lift">+22.4%</strong><small>based on current attacker mix</small></div><div className="predictor-bars"><PredictorBar label="Credential bait exposure" value={policy.bait_ratio} tone="cyan" /><PredictorBar label="Coverage footprint" value={policy.decoy_density} tone="purple" /><PredictorBar label="Containment readiness" value={policy.quarantine_threshold} tone="amber" /></div><div className="model-note"><BrainCircuit size={15} /><span><b>Model recommendation</b> Raise bait ratio by 6% for the next 30-minute window. The active identity replay cluster is under-observed.</span></div></div></div><div className="panel response-rules-panel"><div className="panel-header"><div><SectionEyebrow>AUTOMATED RESPONSE</SectionEyebrow><h2 className="panel-title">Rule set</h2></div><button data-testid="add-response-rule-button" className="text-button" onClick={() => toast.info("Rule builder is ready", { description: "This demo keeps response rules in the simulated policy plane." })}>+ Add rule</button></div><div className="rule-row"><span className="rule-number">01</span><div><strong>Contain high-confidence identity replay</strong><small>If risk score ≥ {policy.quarantine_threshold} and confidence ≥ 90%, isolate session</small></div><Badge className="rule-enabled">ENABLED</Badge><MoreHorizontal size={17} /></div><div className="rule-row"><span className="rule-number">02</span><div><strong>Rotate exposed synthetic secrets</strong><small>When a lure is accessed twice within 10 minutes, rotate credentials</small></div><Badge className="rule-enabled">ENABLED</Badge><MoreHorizontal size={17} /></div></div></div>;
}

function PolicySlider({ dataTestId, label, description, value, onChange }: { dataTestId: string; label: string; description: string; value: number; onChange: (value: number) => void }) {
  return <div className="slider-control"><div className="slider-label"><div><strong>{label}</strong><small>{description}</small></div><b>{value}<span>%</span></b></div><input data-testid={dataTestId} aria-label={label} type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

function PredictorBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="predictor-bar"><div><span>{label}</span><b>{value}%</b></div><i className={tone}><em style={{ width: `${value}%` }} /></i></div>;
}

function IncidentDrawer({ alert, onClose, onQuarantine }: { alert: ThreatAlert; onClose: () => void; onQuarantine: () => void }) {
  return <div className="drawer-backdrop" role="presentation" onClick={onClose}><aside data-testid="incident-investigation-drawer" className="incident-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-header"><div><SectionEyebrow>INCIDENT DEEP DIVE / {alert.id}</SectionEyebrow><h2 data-testid="incident-drawer-title">{alert.title}</h2></div><button data-testid="close-incident-drawer-button" className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="incident-risk"><div><span>ML risk score</span><strong data-testid="incident-risk-score">{alert.score}<small>/100</small></strong></div><div className="risk-ring"><span>{alert.confidence}%</span><small>confidence</small></div></div><div className="incident-block"><span className="drawer-label">OBSERVED ACTIVITY</span><p>{alert.description}</p></div><div className="incident-block"><span className="drawer-label">ATTACK PATH</span><div className="path-step"><span className="path-icon"><User size={14} /></span><div><b>{alert.source}</b><small>External origin · ASN 9009</small></div></div><div className="path-connector" /><div className="path-step"><span className="path-icon"><KeyRound size={14} /></span><div><b>{alert.technique}</b><small>Credential access signal</small></div></div><div className="path-connector" /><div className="path-step"><span className="path-icon"><Shield size={14} /></span><div><b>{alert.asset}</b><small>Synthetic asset boundary</small></div></div></div><div className="feature-list"><span className="drawer-label">TOP MODEL FEATURES</span><div><span>Token reuse velocity</span><b>+0.32</b></div><div><span>Identity graph distance</span><b>+0.27</b></div><div><span>Resource sequence anomaly</span><b>+0.19</b></div></div><div className="drawer-footer"><Button data-testid="quarantine-attacker-button" className="danger-button" onClick={onQuarantine}><ShieldAlert size={15} /> Quarantine attacker</Button><Button data-testid="acknowledge-incident-button" variant="outline" className="tactical-button" onClick={onClose}>Acknowledge</Button></div></aside></div>;
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [selectedAlert, setSelectedAlert] = useState<ThreatAlert | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: () => apiGet<DashboardSnapshot>("/dashboard"), initialData: fallbackSnapshot, retry: false });
  const data = dashboardQuery.data ?? fallbackSnapshot;
  const policyMutation = useMutation({ mutationFn: (policy: Policy) => apiPatch<DashboardSnapshot>("/dashboard/policy", policy), onSuccess: (updated) => { queryClient.setQueryData(["dashboard"], updated); toast.success("Policy updated", { description: "Adaptive controls are now active in the simulation." }); } });
  const actionMutation = useMutation({ mutationFn: (payload: { action: "quarantine" | "rotate-decoys" | "acknowledge"; alert_id?: string }) => apiPost<ActionResponse>("/dashboard/actions", payload), onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ["dashboard"] }); toast.success(result.message); setSelectedAlert(null); } });
  const activeAlert = useMemo(() => selectedAlert ? data.alerts.find((alert) => alert.id === selectedAlert.id) ?? selectedAlert : null, [data.alerts, selectedAlert]);

  const navigate = (view: ViewKey) => { setActiveView(view); setMobileNavOpen(false); };
  const rotateDecoys = () => actionMutation.mutate({ action: "rotate-decoys" });

  return <div data-testid="adaptive-deception-app" className="app-shell">
    <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`} data-testid="app-sidebar"><div className="brand"><span className="brand-mark"><Shield size={19} /></span><span><b>AZURE / DECOY</b><small>ADAPTIVE DEFENSE</small></span></div><div className="environment-chip"><span className="environment-dot" /><div><small>SIMULATED ENVIRONMENT</small><b>AZURE-SIM-EASTUS-01</b></div><MoreHorizontal size={15} /></div><nav className="main-nav" data-testid="main-navigation"><span className="nav-label">OPERATIONS</span>{navItems.map(({ key, label, icon: Icon, count }) => <button type="button" key={key} data-testid={`nav-${key}-tab`} className={`nav-item ${activeView === key ? "active" : ""}`} onClick={() => navigate(key)}><Icon size={16} /><span>{label}</span>{count && <em>{count}</em>}</button>)}<span className="nav-label nav-label-lower">SYSTEM</span><button type="button" data-testid="nav-model-health-tab" className="nav-item" onClick={() => toast.info("Model health is nominal", { description: "All feature pipelines are reporting within tolerance." })}><BrainCircuit size={16} /><span>Model health</span><span className="nav-live-dot" /></button><button type="button" data-testid="nav-settings-tab" className="nav-item" onClick={() => toast.info("Workspace settings", { description: "Settings are locked to the simulation workspace." })}><Settings size={16} /><span>Workspace settings</span></button></nav><div className="sidebar-bottom"><div className="analyst-card"><div className="analyst-avatar">AK</div><div><b>Alex Kim</b><small>SOC ANALYST · L2</small></div><MoreHorizontal size={15} /></div><div className="sidebar-version"><span><span className="pulse-dot" /> Stream nominal</span><span>v2.4.1</span></div></div></aside>
    {mobileNavOpen && <button data-testid="mobile-nav-backdrop" className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}
    <main className="main-content"><header className="topbar"><div className="topbar-left"><button data-testid="mobile-menu-button" className="icon-button mobile-menu-button" onClick={() => setMobileNavOpen(true)}><Menu size={18} /></button><div className="breadcrumb"><span>SECURITY OPERATIONS</span><ChevronRight size={13} /><b>{navItems.find((item) => item.key === activeView)?.label.toUpperCase()}</b></div></div><div className="topbar-right"><div className="telemetry-indicator" data-testid="telemetry-stream-indicator"><span className="pulse-dot" /> LIVE TELEMETRY</div><button data-testid="global-search-button" className="topbar-icon"><Search size={16} /></button><button data-testid="notifications-button" className="topbar-icon notification-button"><Bell size={16} /><i /></button><div className="topbar-user"><div className="topbar-avatar">AK</div><span>Alex Kim</span></div></div></header><div className="content-wrap">{activeView === "overview" && <Overview data={data} onInvestigate={setSelectedAlert} onNavigate={navigate} />}{activeView === "decoys" && <DecoyInventory data={data} onRotate={rotateDecoys} />}{activeView === "threats" && <ThreatMonitor data={data} onInvestigate={setSelectedAlert} />}{activeView === "policy" && <PolicyTuning data={data} onSave={(policy) => policyMutation.mutate(policy)} />}</div></main>
    {activeAlert && <IncidentDrawer alert={activeAlert} onClose={() => setSelectedAlert(null)} onQuarantine={() => actionMutation.mutate({ action: "quarantine", alert_id: activeAlert.id })} />}
  </div>;
    }
