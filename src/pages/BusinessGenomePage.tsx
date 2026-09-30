import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bell,
  ChevronDown,
  Cpu,
  GitCompare,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { DnaHelix, type HelixSegment } from "@/components/genome/DnaHelix";

/* ------------------------------------------------------------------ */
/* Data — the "specimen" is a sample business scan, labelled as a demo */
/* ------------------------------------------------------------------ */

type Status = "LEAKING" | "STABLE" | "DEGRADED";

type Marker = {
  id: string;
  code: string;
  title: string;
  body: string;
  status: Status;
  from: number;
  to: number;
  side: "left" | "right";
};

type Lab = {
  key: string;
  label: string;
  headline: string;
  stats: { value: string; label: string }[];
  markers: Marker[];
};

const STATUS_COLOR: Record<Status, string> = {
  LEAKING: "255,138,61",
  STABLE: "61,220,132",
  DEGRADED: "255,138,61",
};

const LABS: Lab[] = [
  {
    key: "overview",
    label: "Overview",
    headline: "Genome Map",
    stats: [
      { value: "78%", label: "Lead capture rate" },
      { value: "High", label: "Revenue leak risk" },
      { value: "19 h", label: "Avg. lead response" },
      { value: "0.62", label: "Systems stability index" },
    ],
    markers: [
      { id: "m1", code: "LFX-12", title: "Lead Response", body: "Inbound leads wait too long for first contact", status: "LEAKING", from: 0.16, to: 0.26, side: "left" },
      { id: "m2", code: "SYS-04", title: "Internal Systems", body: "CRM + scheduling handoff working as designed", status: "STABLE", from: 0.4, to: 0.47, side: "right" },
      { id: "m3", code: "FUP-21", title: "Follow-Up Cadence", body: "Quotes go cold after the first touch", status: "DEGRADED", from: 0.68, to: 0.8, side: "left" },
    ],
  },
  {
    key: "lead",
    label: "Lead Lab",
    headline: "Lead Flow",
    stats: [
      { value: "41%", label: "Missed-call recovery" },
      { value: "Med", label: "Source attribution gap" },
      { value: "3.2x", label: "Speed-to-lead upside" },
      { value: "0.71", label: "Form completion index" },
    ],
    markers: [
      { id: "m1", code: "LFX-03", title: "Missed Calls", body: "After-hours calls never receive a text back", status: "LEAKING", from: 0.12, to: 0.22, side: "left" },
      { id: "m2", code: "LFX-09", title: "Web Forms", body: "Form routes to the right inbox instantly", status: "STABLE", from: 0.44, to: 0.52, side: "right" },
      { id: "m3", code: "LFX-17", title: "Attribution", body: "No clear view of which channel pays", status: "DEGRADED", from: 0.7, to: 0.8, side: "left" },
    ],
  },
  {
    key: "systems",
    label: "Systems Lab",
    headline: "Operations",
    stats: [
      { value: "11 h", label: "Manual admin / week" },
      { value: "Low", label: "Automation coverage" },
      { value: "6", label: "Disconnected tools" },
      { value: "0.54", label: "Process consistency" },
    ],
    markers: [
      { id: "m1", code: "OPS-02", title: "Double Entry", body: "Same data typed into three different tools", status: "LEAKING", from: 0.18, to: 0.28, side: "left" },
      { id: "m2", code: "OPS-11", title: "Scheduling", body: "Online booking synced with calendar", status: "STABLE", from: 0.4, to: 0.48, side: "right" },
      { id: "m3", code: "OPS-15", title: "Reporting", body: "Owner builds weekly numbers by hand", status: "DEGRADED", from: 0.66, to: 0.76, side: "left" },
    ],
  },
  {
    key: "brand",
    label: "Brand Lab",
    headline: "Brand Signal",
    stats: [
      { value: "64%", label: "Message consistency" },
      { value: "Med", label: "Trust-gap risk" },
      { value: "2.1s", label: "Mobile load time" },
      { value: "0.68", label: "Review velocity" },
    ],
    markers: [
      { id: "m1", code: "BRD-05", title: "Positioning", body: "Site says what you do, not why you win", status: "LEAKING", from: 0.14, to: 0.24, side: "left" },
      { id: "m2", code: "BRD-08", title: "Visual Identity", body: "Logo, color and type applied consistently", status: "STABLE", from: 0.42, to: 0.5, side: "right" },
      { id: "m3", code: "BRD-13", title: "Social Proof", body: "Reviews exist but never reach the site", status: "DEGRADED", from: 0.7, to: 0.8, side: "left" },
    ],
  },
  {
    key: "growth",
    label: "Growth Missions",
    headline: "Growth Plan",
    stats: [
      { value: "+23%", label: "Projected close rate" },
      { value: "90 d", label: "Rebuild window" },
      { value: "14 h", label: "Hours returned / week" },
      { value: "0.88", label: "Target stability" },
    ],
    markers: [
      { id: "m1", code: "GRW-01", title: "AI Lead Desk", body: "Instant replies on every channel, 24/7", status: "STABLE", from: 0.16, to: 0.25, side: "left" },
      { id: "m2", code: "GRW-04", title: "Follow-Up Engine", body: "Automated sequences until a yes or a no", status: "STABLE", from: 0.42, to: 0.5, side: "right" },
      { id: "m3", code: "GRW-07", title: "Owner Dashboard", body: "Live numbers without the spreadsheet", status: "STABLE", from: 0.68, to: 0.78, side: "left" },
    ],
  },
];

const HISTORY = [
  { day: "Wk 1", v: [0.42, 0.55, 0.3] },
  { day: "Wk 2", v: [0.48, 0.6, 0.36] },
  { day: "Wk 3", v: [0.45, 0.5, 0.41] },
  { day: "Wk 4", v: [0.58, 0.66, 0.44] },
  { day: "Wk 5", v: [0.62, 0.7, 0.52] },
  { day: "Wk 6", v: [0.66, 0.74, 0.55] },
  { day: "Wk 7", v: [0.71, 0.8, 0.6] },
  { day: "Wk 8", v: [0.78, 0.84, 0.66] },
];

const BASE_PAIRS = [
  { name: "Lead Flow", pct: 23.6, color: "#ff8a3d" },
  { name: "Sales Process", pct: 23.6, color: "#4c8dff" },
  { name: "Operations", pct: 26.4, color: "#3ddc84" },
  { name: "Brand", pct: 26.4, color: "#c77dff" },
];

const SEQUENCED = [
  { code: "01", title: "Lead Flow", body: "Where inquiries come from, how fast they are answered, and how many quietly disappear." },
  { code: "02", title: "Website Performance", body: "Speed, clarity and conversion paths, measured against what buyers actually do." },
  { code: "03", title: "Brand & Positioning", body: "Whether your message earns trust before the first conversation happens." },
  { code: "04", title: "Sales Process", body: "Quotes, handoffs and close rates, stage by stage, with the drop-offs marked." },
  { code: "05", title: "Follow-Up", body: "The deals lost to silence, and the cadence that would have won them." },
  { code: "06", title: "Internal Systems", body: "Tools, data and manual work that slow your team down every single week." },
  { code: "07", title: "Customer Experience", body: "What it feels like to buy from you, from first click to repeat referral." },
  { code: "08", title: "Operational Gaps", body: "The processes that live in one person's head and break when they are out." },
];

const PROCESS = [
  { step: "Sequence", body: "We map the full business, not just the marketing, and score every system that touches revenue." },
  { step: "Diagnose", body: "You see exactly where time, leads and money leak, ranked by what each gap costs you." },
  { step: "Rebuild", body: "We build the fix: AI tools, automation, strategy and digital systems tailored to how you run." },
];

/* ------------------------------------------------------------------ */

function Panel({
  title,
  right,
  children,
  className = "",
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`gx-panel ${className}`}>
      {(title || right) && (
        <header className="gx-panel-head">
          {title && <span className="gx-tag">{title}</span>}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const label = status === "LEAKING" ? "Leaking" : status === "STABLE" ? "Stable" : "Partially degraded";
  return <span className={`gx-badge gx-badge-${status.toLowerCase()}`}>{label}</span>;
}

function Pulse() {
  // Heartbeat-style trace for "pipeline vitals"
  return (
    <svg viewBox="0 0 120 32" className="gx-pulse" aria-hidden="true">
      <polyline
        points="0,20 18,20 24,20 28,8 32,28 36,14 40,20 60,20 66,20 70,6 74,30 78,16 82,20 120,20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function Wave() {
  return (
    <svg viewBox="0 0 120 32" className="gx-pulse" aria-hidden="true">
      <path d="M0 22 C 15 22, 20 8, 35 10 S 55 26, 70 18 S 95 6, 120 12" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function Orbit() {
  // Tangled-strand composition graphic
  const paths = useMemo(() => {
    const out: string[] = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 34; i++) {
      const a1 = rnd() * Math.PI * 2;
      const a2 = a1 + Math.PI * (0.6 + rnd() * 0.8);
      const r = 40;
      const c = 18 + rnd() * 20;
      out.push(
        `M ${50 + Math.cos(a1) * r} ${50 + Math.sin(a1) * r} Q ${50 + Math.cos(a1 + 1) * c} ${50 + Math.sin(a1 + 1) * c} ${50 + Math.cos(a2) * r} ${50 + Math.sin(a2) * r}`,
      );
    }
    return out;
  }, []);
  return (
    <svg viewBox="0 0 100 100" className="gx-orbit" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(76,141,255,.55)" strokeWidth="0.8" />
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(230,236,245,.55)" strokeWidth="0.35" />
      ))}
    </svg>
  );
}

function MiniHelix() {
  const rows = Array.from({ length: 16 });
  const colors = ["#ff8a3d", "#4c8dff", "#3ddc84", "#c77dff"];
  return (
    <svg viewBox="0 0 40 160" className="gx-minihelix" aria-hidden="true">
      {rows.map((_, i) => {
        const y = 6 + i * 9.5;
        const x = Math.sin(i * 0.7) * 14;
        return (
          <g key={i}>
            <line x1={20 - x} y1={y} x2={20 + x} y2={y} stroke={colors[i % 4]} strokeWidth="1.6" opacity="0.85" />
            <circle cx={20 - x} cy={y} r="1.6" fill="#dfe6f0" />
            <circle cx={20 + x} cy={y} r="1.6" fill="#dfe6f0" />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */

export default function BusinessGenomePage() {
  const [labKey, setLabKey] = useState("overview");
  const [profileOpen, setProfileOpen] = useState(true);
  const lab = LABS.find((l) => l.key === labKey) ?? LABS[0];

  const segments: HelixSegment[] = useMemo(
    () => lab.markers.map((m) => ({ id: m.id, from: m.from, to: m.to, color: STATUS_COLOR[m.status] })),
    [lab],
  );

  // Callout tracking — written straight to the DOM each frame to avoid re-rendering at 60fps.
  const stageRef = useRef<HTMLDivElement>(null);
  const calloutRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lineRefs = useRef<Record<string, SVGPolylineElement | null>>({});
  const dotRefs = useRef<Record<string, SVGCircleElement | null>>({});

  const onAnchors = useCallback(
    (anchors: Record<string, { x: number; y: number }>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const sw = stage.clientWidth;
      for (const m of lab.markers) {
        const a = anchors[m.id];
        const el = calloutRefs.current[m.id];
        const line = lineRefs.current[m.id];
        const dot = dotRefs.current[m.id];
        if (!a || !el || !line || !dot) continue;
        const boxW = el.offsetWidth;
        const boxY = a.y - 70;
        const boxX = m.side === "left" ? Math.max(4, a.x - boxW - 36) : Math.min(sw - boxW - 4, a.x + 36);
        el.style.transform = `translate(${boxX}px, ${boxY}px)`;
        const edgeX = m.side === "left" ? boxX + boxW : boxX;
        const elbowX = m.side === "left" ? edgeX + 18 : edgeX - 18;
        line.setAttribute("points", `${edgeX},${boxY + 14} ${elbowX},${boxY + 14} ${a.x},${a.y}`);
        dot.setAttribute("cx", String(a.x));
        dot.setAttribute("cy", String(a.y));
      }
    },
    [lab],
  );

  useEffect(() => {
    document.title = "Business Genome Map | Aetheris";
  }, []);

  return (
    <div className="gx-root">
      <style>{CSS}</style>
      <div className="gx-bg" aria-hidden="true" />

      {/* ---------- Top bar ---------- */}
      <header className="gx-top">
        <Link to="/" className="gx-logo" aria-label="Aetheris home">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M4 3 C 10 9, 14 15, 20 21" stroke="#4c8dff" strokeWidth="2" fill="none" />
            <path d="M20 3 C 14 9, 10 15, 4 21" stroke="#9fc2ff" strokeWidth="2" fill="none" />
          </svg>
          <span>
            AETHERI<span className="gx-accent">S</span>
          </span>
        </Link>

        <nav className="gx-tabs" aria-label="Genome labs">
          {LABS.map((l) => (
            <button
              key={l.key}
              type="button"
              className={`gx-tab ${l.key === labKey ? "is-active" : ""}`}
              onClick={() => setLabKey(l.key)}
              aria-pressed={l.key === labKey}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="gx-tools">
          <label className="gx-search">
            <Search size={14} />
            <input placeholder="Search systems" aria-label="Search systems" />
          </label>
          <button type="button" className="gx-icon" aria-label="Alerts">
            <Bell size={15} />
          </button>
          <button type="button" className="gx-icon" aria-label="Settings">
            <Settings size={15} />
          </button>
          <Link to="/book" className="gx-icon" aria-label="Book a call">
            <User size={15} />
          </Link>
        </div>
      </header>

      {/* ---------- HUD dashboard ---------- */}
      <main className="gx-dash">
        {/* Left column */}
        <div className="gx-col-left">
          <span className="gx-chip">Demo specimen · Active sync</span>
          <h1 className="gx-h1">{lab.headline}</h1>
          <p className="gx-sub">Specimen BX-023 · Service business</p>

          <Panel
            title="AI Analytics"
            right={
              <span className="gx-spark">
                <Sparkles size={14} />
              </span>
            }
            className="gx-analytics"
          >
            <div className="gx-stats">
              {lab.stats.map((s) => (
                <div key={s.label} className="gx-stat">
                  <div className="gx-stat-v">{s.value}</div>
                  <div className="gx-stat-l">{s.label}</div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="gx-actions">
            {[
              { icon: GitCompare, t: "Leak Comparison", d: "Compare against top performers in your industry" },
              { icon: Activity, t: "Buyer Behavior Predictor", d: "Intent, objections, speed to decision" },
              { icon: SlidersHorizontal, t: "Systems Tuner", d: "Automation, handoffs, reporting" },
            ].map(({ icon: Icon, t, d }) => (
              <Link to="/book" key={t} className="gx-action">
                <Icon size={15} />
                <div>
                  <div className="gx-action-t">{t}</div>
                  <div className="gx-action-d">{d}</div>
                </div>
                <ArrowRight size={14} className="gx-action-arrow" />
              </Link>
            ))}
          </div>
        </div>

        {/* Center column */}
        <div className="gx-col-mid">
          {profileOpen ? (
            <Panel
              title="Business Profile"
              right={
                <div className="gx-head-right">
                  <span className="gx-risk">Leak risk: High</span>
                  <button type="button" className="gx-close" onClick={() => setProfileOpen(false)} aria-label="Collapse profile">
                    <X size={13} />
                  </button>
                </div>
              }
            >
              <div className="gx-code">BX-023</div>
              <div className="gx-name">Home Services Co.</div>
              <div className="gx-pills">
                <span>Local</span>
                <span>12 staff</span>
                <span>$2.4M revenue</span>
              </div>
              <dl className="gx-dl">
                <div><dt>Industry</dt><dd>HVAC &amp; Plumbing</dd></div>
                <div><dt>Primary channel</dt><dd>Google · Referrals</dd></div>
                <div><dt>Stage</dt><dd>Established · 9 yrs</dd></div>
                <div><dt>Systems mapped</dt><dd>87%</dd></div>
                <div><dt>Data quality</dt><dd>62% usable</dd></div>
              </dl>
              <div className="gx-scan">
                <Cpu size={40} strokeWidth={1} />
                <span>Scanning 214 touchpoints</span>
              </div>
            </Panel>
          ) : (
            <button type="button" className="gx-reopen" onClick={() => setProfileOpen(true)}>
              <Plus size={14} /> Show business profile
            </button>
          )}

          <Panel
            title="History"
            right={
              <span className="gx-month">
                Last 8 weeks <ChevronDown size={12} />
              </span>
            }
          >
            <div className="gx-hist-stats">
              <div><i style={{ background: "#3ddc84" }} />System stability<b>0.91</b></div>
              <div><i style={{ background: "#c77dff" }} />Response time<b>19 h</b></div>
              <div><i style={{ background: "#4c8dff" }} />Close rate<b>78%</b></div>
            </div>
            <div className="gx-bars">
              {HISTORY.map((h) => (
                <div key={h.day} className="gx-bar-group">
                  <div className="gx-bar-stack">
                    {h.v.map((v, i) => (
                      <span
                        key={i}
                        className="gx-bar"
                        style={{ height: `${v * 100}%`, ["--c" as string]: ["#3ddc84", "#c77dff", "#4c8dff"][i] }}
                      />
                    ))}
                  </div>
                  <span className="gx-bar-l">{h.day}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Helix stage */}
        <div className="gx-stage" ref={stageRef}>
          <DnaHelix segments={segments} onAnchors={onAnchors} className="gx-canvas" />
          <svg className="gx-lines" aria-hidden="true">
            {lab.markers.map((m) => (
              <g key={m.id}>
                <polyline
                  ref={(el) => (lineRefs.current[m.id] = el)}
                  fill="none"
                  stroke="rgba(223,230,240,.55)"
                  strokeWidth="1"
                />
                <circle
                  ref={(el) => (dotRefs.current[m.id] = el)}
                  r="7"
                  fill="none"
                  stroke="rgba(255,255,255,.85)"
                  strokeWidth="1.2"
                />
              </g>
            ))}
          </svg>
          {lab.markers.map((m) => (
            <div key={`${lab.key}-${m.id}`} ref={(el) => (calloutRefs.current[m.id] = el)} className="gx-callout">
              <div className="gx-callout-code">{m.code}</div>
              <div className="gx-callout-t">{m.title}</div>
              <div className="gx-callout-b">{m.body}</div>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>

        {/* Right column */}
        <div className="gx-col-right">
          <Panel title="Pipeline Vitals" right={<span className="gx-mono gx-dim gx-id">ID: PIPE-023-VR</span>}>
            <div className="gx-vitals">
              <div className="gx-vital-img">
                <Activity size={44} strokeWidth={1} />
              </div>
              <dl className="gx-dl gx-dl-tight">
                <div><dt>Scan day</dt><dd className="gx-accent">Day 12 / 32</dd></div>
                <div><dt>Open deals</dt><dd>48</dd></div>
                <div><dt>Pipeline value</dt><dd>$312k</dd></div>
              </dl>
            </div>
            <div className="gx-vital-row">
              <div className="gx-vital-box">
                <span className="gx-dim">Leads / day</span>
                <b>82</b>
                <span className="gx-green"><Pulse /></span>
              </div>
              <div className="gx-vital-box">
                <span className="gx-dim">Pipeline temp</span>
                <b>37.1°</b>
                <span className="gx-blue"><Wave /></span>
              </div>
            </div>
          </Panel>

          <div className="gx-right-pair">
            <Panel title="Growth Composition">
              <div className="gx-dim gx-center gx-small">Specimen BX-023</div>
              <Orbit />
              <div className="gx-center gx-mono gx-small">Composition</div>
              <div className="gx-meter">
                <span>Recovered</span>
                <div><i style={{ width: "76%" }} /></div>
                <b>76%</b>
              </div>
              <div className="gx-meter">
                <span>Automated</span>
                <div><i style={{ width: "41%", background: "#ff8a3d" }} /></div>
                <b>41%</b>
              </div>
            </Panel>

            <Panel title="Business DNA">
              <div className="gx-dna">
                <MiniHelix />
                <ul>
                  {BASE_PAIRS.map((b) => (
                    <li key={b.name}>
                      <span className="gx-dim">{b.name}</span>
                      <b style={{ color: b.color }}>{b.pct}%</b>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </div>
        </div>
      </main>

      {/* ---------- What we sequence ---------- */}
      <section className="gx-section">
        <div className="gx-section-head">
          <span className="gx-chip">Full-business sequencing</span>
          <h2 className="gx-h2">We analyze the whole business, not just the marketing.</h2>
          <p className="gx-lead">
            Every company has a genome: the systems, habits and handoffs that decide how fast it grows. We find where it is
            leaking time, leads and revenue, then build smarter systems to fix it.
          </p>
        </div>
        <div className="gx-grid">
          {SEQUENCED.map((s) => (
            <Panel key={s.code} className="gx-card">
              <div className="gx-card-code">SEQ-{s.code}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* ---------- Process ---------- */}
      <section className="gx-section">
        <div className="gx-process">
          {PROCESS.map((p, i) => (
            <Panel key={p.step} className="gx-step">
              <div className="gx-step-n">0{i + 1}</div>
              <h3>{p.step}</h3>
              <p>{p.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="gx-section gx-cta-wrap">
        <Panel className="gx-cta">
          <div>
            <span className="gx-chip">Start your scan</span>
            <h2 className="gx-h2">See your own genome map.</h2>
            <p className="gx-lead">
              A working session that shows exactly where your business is losing time, leads and money, and what we
              would build to fix it.
            </p>
          </div>
          <div className="gx-cta-btns">
            <Link to="/book" className="gx-btn gx-btn-primary">
              Book a diagnostic <ArrowRight size={16} />
            </Link>
            <Link to="/business-diagnostic" className="gx-btn">
              Take the free quiz
            </Link>
          </div>
        </Panel>
        <p className="gx-foot gx-mono">Figures shown are a demo specimen for illustration, not a real client.</p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scoped styles                                                       */
/* ------------------------------------------------------------------ */

const CSS = `
.gx-root{--bg:#06090f;--panel:rgba(13,19,29,.72);--line:rgba(150,172,204,.16);--line2:rgba(150,172,204,.32);
  --text:#dfe6f0;--muted:#7f8ca0;--blue:#4c8dff;--orange:#ff8a3d;--green:#3ddc84;
  position:relative;min-height:100vh;background:var(--bg);color:var(--text);
  font-family:"Space Grotesk",system-ui,sans-serif;overflow-x:hidden}
.gx-bg{position:fixed;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(60% 50% at 70% 30%,rgba(76,141,255,.10),transparent 70%),
    radial-gradient(40% 40% at 10% 90%,rgba(61,220,132,.05),transparent 70%),
    radial-gradient(circle at 1px 1px,rgba(255,255,255,.05) 1px,transparent 0) 0 0/28px 28px}
.gx-root>*:not(.gx-bg):not(style){position:relative;z-index:1}
.gx-mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.gx-dim{color:var(--muted)}.gx-accent{color:var(--blue)}.gx-green{color:var(--green)}.gx-blue{color:var(--blue)}
.gx-id{font-size:10px;padding-right:10px}
.gx-center{text-align:center}.gx-small{font-size:10px;letter-spacing:.08em;text-transform:uppercase}

/* top bar */
.gx-top{display:flex;align-items:center;gap:24px;padding:18px 28px;border-bottom:1px solid var(--line)}
.gx-logo{display:flex;align-items:center;gap:10px;font-weight:500;letter-spacing:.14em;font-size:15px;color:var(--text);text-decoration:none}
.gx-tabs{display:flex;gap:4px;flex:1;overflow-x:auto;scrollbar-width:none}
.gx-tabs::-webkit-scrollbar{display:none}
.gx-tab{position:relative;padding:9px 18px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);
  background:none;border:0;white-space:nowrap;cursor:pointer;transition:color .2s}
.gx-tab::before{content:"";position:absolute;left:0;top:6px;bottom:6px;width:1px;background:var(--line2);transform:skewX(-14deg)}
.gx-tab:hover{color:var(--text)}
.gx-tab.is-active{color:var(--text);border:1px solid var(--line2);background:rgba(255,255,255,.03)}
.gx-tab.is-active::before{display:none}
.gx-tools{display:flex;align-items:center;gap:8px}
.gx-search{display:flex;align-items:center;gap:8px;border:1px solid var(--line2);padding:7px 12px;color:var(--muted);
  clip-path:polygon(0 0,100% 0,100% 70%,94% 100%,0 100%)}
.gx-search input{background:none;border:0;outline:0;color:var(--text);font-size:11px;letter-spacing:.08em;width:130px;text-transform:uppercase}
.gx-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line2);color:var(--text);background:none;cursor:pointer;
  clip-path:polygon(0 0,100% 0,100% 72%,72% 100%,0 100%)}
.gx-icon:hover{border-color:var(--blue);color:var(--blue)}

/* dashboard grid */
.gx-dash{display:grid;grid-template-columns:minmax(240px,1fr) minmax(250px,1fr) minmax(280px,1.25fr) minmax(300px,1.3fr);
  gap:18px;padding:26px 28px 40px;align-items:start}
.gx-col-left,.gx-col-mid,.gx-col-right{display:flex;flex-direction:column;gap:14px}
.gx-chip{display:inline-block;align-self:flex-start;background:rgba(76,141,255,.16);color:#9fc2ff;border:1px solid rgba(76,141,255,.35);
  font-size:10px;letter-spacing:.12em;text-transform:uppercase;padding:4px 10px;font-family:"JetBrains Mono",monospace}
.gx-h1{font-size:clamp(30px,3.2vw,46px);font-weight:400;letter-spacing:.04em;text-transform:uppercase;line-height:1;margin:6px 0 0}
.gx-sub{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}

/* panel with HUD corner brackets */
.gx-panel{position:relative;background:var(--panel);border:1px solid var(--line);padding:14px 16px;backdrop-filter:blur(6px)}
.gx-panel::before,.gx-panel::after{content:"";position:absolute;width:10px;height:10px;border-color:var(--line2);border-style:solid;pointer-events:none}
.gx-panel::before{top:-1px;left:-1px;border-width:1px 0 0 1px}
.gx-panel::after{bottom:-1px;right:-1px;border-width:0 1px 1px 0}
.gx-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:-14px -16px 12px;padding:0}
.gx-tag{display:inline-block;background:rgba(255,255,255,.06);border-right:1px solid var(--line2);border-bottom:1px solid var(--line2);
  padding:6px 14px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;clip-path:polygon(0 0,100% 0,100% 60%,88% 100%,0 100%)}
.gx-head-right{display:flex;align-items:center;gap:8px;padding-right:8px}
.gx-risk{font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--orange);
  border:1px solid rgba(255,138,61,.45);background:rgba(255,138,61,.08);padding:3px 8px}
.gx-close{display:grid;place-items:center;width:22px;height:22px;border:1px solid var(--line2);background:none;color:var(--text);cursor:pointer}
.gx-reopen{display:flex;align-items:center;gap:8px;border:1px dashed var(--line2);background:none;color:var(--muted);padding:12px;cursor:pointer;
  font-size:11px;letter-spacing:.1em;text-transform:uppercase}

/* analytics */
.gx-analytics{background:linear-gradient(160deg,rgba(76,141,255,.10),rgba(13,19,29,.8) 55%)}
.gx-spark{display:grid;place-items:center;width:28px;height:28px;margin-right:8px;background:rgba(76,141,255,.18);color:#9fc2ff}
.gx-stats{display:grid;grid-template-columns:1fr 1fr;gap:18px 14px;padding:6px 2px}
.gx-stat{border-left:1px solid var(--line2);padding-left:10px}
.gx-stat-v{font-size:28px;font-weight:300;letter-spacing:.02em;line-height:1.1}
.gx-stat-l{font-size:10.5px;color:var(--muted);margin-top:4px}
.gx-actions{display:flex;flex-direction:column;gap:8px}
.gx-action{display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid var(--line);background:var(--panel);color:var(--text);
  text-decoration:none;transition:border-color .2s,background .2s}
.gx-action:hover{border-color:rgba(76,141,255,.5);background:rgba(76,141,255,.06)}
.gx-action-t{font-size:11px;letter-spacing:.1em;text-transform:uppercase}
.gx-action-d{font-size:10.5px;color:var(--muted);margin-top:2px}
.gx-action-arrow{margin-left:auto;color:var(--muted)}

/* profile */
.gx-code{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--blue);letter-spacing:.08em}
.gx-name{font-size:24px;font-weight:400;margin:2px 0 8px}
.gx-pills{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.gx-pills span{font-size:10px;color:var(--muted);border:1px solid var(--line2);padding:3px 8px}
.gx-dl{margin:0;display:flex;flex-direction:column;gap:7px;font-size:11px}
.gx-dl div{display:flex;justify-content:space-between;gap:10px}
.gx-dl dt{color:var(--text)}.gx-dl dd{margin:0;color:var(--muted);text-align:right}
.gx-dl-tight{flex:1}
.gx-scan{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:14px;padding:22px 10px;border:1px solid var(--line);
  color:rgba(223,230,240,.7);font-size:10px;letter-spacing:.12em;text-transform:uppercase;overflow:hidden;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 4px)}
.gx-scan::after{content:"";position:absolute;left:0;right:0;height:40%;top:-40%;
  background:linear-gradient(180deg,transparent,rgba(76,141,255,.18),transparent);animation:gx-sweep 3.2s linear infinite}
@keyframes gx-sweep{to{top:100%}}

/* history */
.gx-month{display:flex;align-items:center;gap:4px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);
  border:1px solid var(--line2);padding:4px 8px;margin-right:8px}
.gx-hist-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.gx-hist-stats div{display:flex;flex-direction:column;font-size:9.5px;color:var(--muted);gap:3px}
.gx-hist-stats i{display:inline-block;width:5px;height:5px;margin-bottom:2px}
.gx-hist-stats b{color:var(--text);font-weight:300;font-size:20px}
.gx-bars{display:flex;justify-content:space-between;gap:6px;height:120px;border-top:1px solid var(--line);padding-top:8px}
.gx-bar-group{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px}
.gx-bar-stack{flex:1;display:flex;align-items:flex-end;gap:3px;width:100%;justify-content:center}
.gx-bar{width:4px;background:repeating-linear-gradient(0deg,var(--c) 0 2px,transparent 2px 4px);opacity:.85;
  transform-origin:bottom;animation:gx-grow .9s cubic-bezier(.2,.7,.2,1) both}
@keyframes gx-grow{from{transform:scaleY(0)}}
.gx-bar-l{font-size:9px;color:var(--muted);font-family:"JetBrains Mono",monospace}

/* helix stage */
.gx-stage{position:relative;height:clamp(560px,78vh,760px);margin:-10px 0}
.gx-canvas{position:absolute;inset:0;width:100%;height:100%}
.gx-lines{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.gx-callout{position:absolute;left:0;top:0;width:170px;padding:9px 11px;background:rgba(10,15,24,.82);border:1px solid var(--line2);
  backdrop-filter:blur(4px);will-change:transform;animation:gx-fade .5s ease both}
@keyframes gx-fade{from{opacity:0}}
.gx-callout-code{position:absolute;top:-22px;right:0;font-size:10.5px;letter-spacing:.08em;border:1px solid var(--line2);padding:2px 8px;
  background:rgba(10,15,24,.9);font-family:"JetBrains Mono",monospace}
.gx-callout-t{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase}
.gx-callout-b{font-size:10px;color:var(--muted);margin:3px 0 8px;line-height:1.35}
.gx-badge{display:inline-block;font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border:1px solid}
.gx-badge-leaking,.gx-badge-degraded{color:var(--orange);border-color:rgba(255,138,61,.5);background:rgba(255,138,61,.08)}
.gx-badge-stable{color:var(--green);border-color:rgba(61,220,132,.5);background:rgba(61,220,132,.08)}

/* right column */
.gx-vitals{display:flex;gap:14px;align-items:stretch}
.gx-vital-img{display:grid;place-items:center;width:96px;min-height:96px;border:1px solid var(--line);color:rgba(223,230,240,.75);
  background:radial-gradient(circle,rgba(76,141,255,.14),transparent 70%)}
.gx-vital-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.gx-vital-box{display:flex;flex-direction:column;gap:2px;padding:9px 10px;border:1px solid var(--line);font-size:10px}
.gx-vital-box b{font-size:20px;font-weight:300}
.gx-pulse{width:100%;height:26px}
.gx-right-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.gx-orbit{display:block;width:100%;max-width:150px;margin:8px auto;animation:gx-spin 60s linear infinite}
@keyframes gx-spin{to{transform:rotate(360deg)}}
.gx-meter{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:6px;font-size:9.5px;color:var(--muted);margin-top:6px}
.gx-meter div{height:2px;background:var(--line)}
.gx-meter i{display:block;height:100%;background:var(--blue)}
.gx-meter b{color:var(--text);font-weight:400}
.gx-dna{display:flex;gap:10px;align-items:center}
.gx-minihelix{width:40px;height:170px;flex-shrink:0}
.gx-dna ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:14px;font-size:10.5px;flex:1}
.gx-dna li{display:flex;flex-direction:column;gap:1px}
.gx-dna b{font-weight:400;font-size:13px}

/* lower sections */
.gx-section{padding:40px 28px;max-width:1280px;margin:0 auto}
.gx-section-head{max-width:720px;margin-bottom:28px;display:flex;flex-direction:column;gap:12px}
.gx-h2{font-size:clamp(26px,3vw,40px);font-weight:400;line-height:1.1;margin:0;letter-spacing:.01em}
.gx-lead{color:var(--muted);font-size:15px;line-height:1.6;margin:0;font-family:Inter,system-ui,sans-serif}
.gx-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.gx-card{transition:border-color .2s,transform .2s}
.gx-card:hover{border-color:rgba(76,141,255,.45);transform:translateY(-2px)}
.gx-card-code,.gx-step-n{font-family:"JetBrains Mono",monospace;font-size:10.5px;color:var(--blue);letter-spacing:.1em}
.gx-card h3,.gx-step h3{font-size:16px;font-weight:500;margin:8px 0 6px;letter-spacing:.02em}
.gx-card p,.gx-step p{font-size:13px;color:var(--muted);line-height:1.55;margin:0;font-family:Inter,system-ui,sans-serif}
.gx-process{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.gx-step{padding:22px}
.gx-step-n{font-size:28px;font-weight:300;color:var(--text);opacity:.5}
.gx-cta{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:34px;
  background:linear-gradient(120deg,rgba(76,141,255,.14),rgba(13,19,29,.85) 60%)}
.gx-cta>div:first-child{display:flex;flex-direction:column;gap:12px;max-width:600px}
.gx-cta-btns{display:flex;flex-direction:column;gap:10px;flex-shrink:0}
.gx-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 22px;border:1px solid var(--line2);color:var(--text);
  text-decoration:none;font-size:12px;letter-spacing:.12em;text-transform:uppercase;transition:all .2s;
  clip-path:polygon(0 0,100% 0,100% 70%,94% 100%,0 100%)}
.gx-btn:hover{border-color:var(--blue)}
.gx-btn-primary{background:var(--blue);border-color:var(--blue);color:#fff}
.gx-btn-primary:hover{background:#6a9fff}
.gx-foot{text-align:center;font-size:10px;color:var(--muted);letter-spacing:.06em;margin-top:22px}

/* responsive */
@media (max-width:1280px){
  .gx-dash{grid-template-columns:1fr 1fr 1.2fr}
  .gx-col-right{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:14px}
}
@media (max-width:980px){
  .gx-top{flex-wrap:wrap;gap:12px;padding:14px 16px}
  .gx-tabs{order:3;flex-basis:100%}
  .gx-search input{width:90px}
  .gx-dash{grid-template-columns:1fr 1fr;padding:20px 16px}
  .gx-stage{grid-column:1/-1;grid-row:1;height:560px;margin:0}
  .gx-col-right{grid-template-columns:1fr}
  .gx-grid{grid-template-columns:repeat(2,1fr)}
  .gx-section{padding:32px 16px}
}
@media (max-width:640px){
  .gx-search{display:none}
  .gx-dash{grid-template-columns:1fr}
  .gx-stage{height:520px}
  .gx-callout{width:140px}
  .gx-right-pair,.gx-grid,.gx-process{grid-template-columns:1fr}
  .gx-cta{flex-direction:column;align-items:stretch;padding:24px}
}
@media (prefers-reduced-motion:reduce){
  .gx-scan::after,.gx-orbit,.gx-bar,.gx-callout{animation:none}
}
`;
