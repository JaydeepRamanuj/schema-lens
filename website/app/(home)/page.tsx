"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Database,
  Search,
  Star,
  Zap,
  TrendingDown,
  Lock,
  Terminal,
  Copy,
  Check,
  Play,
  Pause,
  ChevronRight,
  AlertTriangle,
  BadgeCheck,
  Shield,
  RefreshCw,
  PieChart,
  Timer,
  BarChart3,
  GitBranch,
  LayoutGrid,
  ArrowRight,
  Fingerprint,
  KeyRound,
  Plane,
  Cpu,
} from "lucide-react";

// ─── UTILITY ───────────────────────────────────────────────────────────────────

function useCopyButton(text: string, durationMs = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), durationMs);
    } catch {}
  }, [text, durationMs]);
  return { copied, copy };
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function EyebrowBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1d1f28] font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-[#4cd7f6] mb-4">
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl md:text-[48px] font-bold leading-[1.15] tracking-[-0.025em] text-[#e1e2ee] mb-3">
      {children}
    </h2>
  );
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[14px] leading-[22px] text-[#bcc9cd] max-w-2xl mx-auto">
      {children}
    </p>
  );
}

function TerminalChrome({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="h-10 px-4 bg-[#272a33] flex items-center justify-between rounded-t-xl flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ffb4ab]/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#0566d9]/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3]/70" />
        <span className="font-mono text-[11px] text-[#869397] ml-2">
          {title}
        </span>
      </div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────

function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#10131c]/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.06),0_4px_24px_rgba(0,0,0,0.4)]"
          : "bg-transparent"
      }`}
    >
      <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#272a33] flex items-center justify-center relative shadow-[0_0_16px_rgba(76,215,246,0.2)]">
              <Database className="text-[#4cd7f6]" size={16} />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#0566d9] flex items-center justify-center">
                <Search size={8} className="text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[18px] font-semibold tracking-tight text-[#e1e2ee]">
                schema-lens
              </span>
              <span className="font-mono text-[11px] text-[#869397] px-1.5 py-0.5 rounded bg-[#0b0e16]">
                dbctx
              </span>
            </div>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#191b24]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] neon-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.05em] text-[#bcc9cd]">
              v0.1.4
            </span>
          </div>
        </div>

        <nav className="hidden xl:flex items-center gap-0.5">
          {[
            ["Agent Sim", "#agent-sim"],
            ["Why schema-lens", "#why"],
            ["Features", "#features"],
            ["Playground", "#playground"],
            ["Setup", "#setup"],
            ["Docs", "/docs/intro"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="px-3 py-1.5 rounded-lg text-[14px] text-[#bcc9cd] hover:bg-[#272a33] hover:text-[#e1e2ee] transition-all"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com/JaydeepRamanuj/schema-lens"
            target="_blank"
            rel="noopener"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1d1f28] hover:bg-[#272a33] text-[#bcc9cd] hover:text-[#e1e2ee] transition-all font-mono text-[11px]"
          >
            <Star size={14} className="text-[#4cd7f6]" />
            <span>1.2k</span>
          </a>
          <Link
            href="/docs/intro"
            className="px-4 py-1.5 rounded-lg bg-[#4cd7f6] text-[#003640] hover:bg-[#acedff] transition-all shadow-[0_0_20px_rgba(76,215,246,0.3)] text-[14px] font-semibold"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  const { copied: heroCopied, copy: copyHero } = useCopyButton("npx dbctx init");

  return (
    <section className="relative w-full overflow-hidden pt-32 pb-16">
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[480px] bg-[#4cd7f6]/10 rounded-full blur-[140px]" />
      <div className="pointer-events-none absolute top-48 right-10 w-[360px] h-[360px] bg-[#0566d9]/15 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#272a33] shadow-sm mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4cd7f6] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4cd7f6]" />
          </span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-[#4cd7f6]">
            v0.1.4 Public Beta
          </span>
          <span className="text-[#869397] text-xs">•</span>
          <span className="text-[13px] text-[#bcc9cd]">
            Local PostgreSQL Schema Cache for Coding Agents
          </span>
        </div>

        <h1 className="text-[48px] md:text-[64px] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#e1e2ee] max-w-4xl mb-6">
          Stop guessing your schema.
          <br />
          <span className="bg-gradient-to-r from-[#4cd7f6] via-[#acedff] to-[#adc6ff] bg-clip-text text-transparent">
            Let your AI agent look it up.
          </span>
        </h1>

        <p className="text-[18px] leading-[28px] text-[#bcc9cd] max-w-2xl mb-8">
          <code className="font-mono text-[13px] text-[#4cd7f6] bg-[#272a33] px-1.5 py-0.5 rounded">
            schema-lens
          </code>{" "}
          caches your PostgreSQL schema locally and serves surgical relationship
          paths to Claude, Cursor, and Windsurf in milliseconds — no remote SQL
          roundtrips, no hallucinated column names.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 w-full max-w-xl">
          <Link
            href="/docs/intro"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#06b6d4] to-[#0566d9] text-white font-semibold text-[14px] shadow-lg shadow-[#4cd7f6]/20 hover:shadow-[#4cd7f6]/35 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Get Started Free
            <ArrowRight size={16} />
          </Link>

          <button
            onClick={copyHero}
            className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[#272a33] hover:bg-[#32343e] transition-all group font-mono text-[13px] text-[#e1e2ee]"
          >
            <span className="text-[#4cd7f6] font-bold">$</span>
            <span>npx dbctx init</span>
            {heroCopied ? (
              <Check size={16} className="text-[#4edea3]" />
            ) : (
              <Copy size={16} className="text-[#869397] group-hover:text-[#4cd7f6] transition-colors" />
            )}
          </button>

          <a
            href="https://github.com/JaydeepRamanuj/schema-lens"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#1d1f28] hover:bg-[#272a33] transition-colors text-[14px] text-[#bcc9cd] hover:text-[#e1e2ee]"
          >
            <Star size={16} className="text-[#4cd7f6]" />
            <span>GitHub</span>
            <span className="px-2 py-0.5 rounded bg-[#0b0e16] font-mono text-[11px] text-[#869397]">
              1.2k ★
            </span>
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          {[
            { icon: <Zap size={14} className="text-[#4edea3]" />, label: "2.1ms Local Cache Read" },
            { icon: <TrendingDown size={14} className="text-[#4cd7f6]" />, label: "95.7% Token Reduction" },
            { icon: <Lock size={14} className="text-[#adc6ff]" />, label: "Air-Gapped DB Security" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#191b24] shadow-sm">
              {icon}
              <span className="font-mono text-[11px] text-[#e1e2ee]">{label}</span>
            </div>
          ))}
        </div>

        {/* Hero terminal */}
        <div className="w-full max-w-5xl rounded-xl bg-[#191b24] shadow-2xl p-1 text-left">
          <div className="rounded-lg bg-[#0b0e16] overflow-hidden">
            <TerminalChrome
              title="claude-desktop ~ stdio:mcp/dbctx"
              right={
                <>
                  <span className="px-2 py-0.5 rounded bg-[#1d1f28] text-[#4edea3] font-mono text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
                    MCP Ready
                  </span>
                  <span className="font-mono text-[11px] text-[#869397]">schema_fingerprint: a9f81d</span>
                </>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-12 p-4 gap-4">
              <div className="md:col-span-5 p-4 rounded-lg bg-[#1d1f28] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#adc6ff] flex items-center justify-center">
                        <Cpu size={11} className="text-[#002e6a]" />
                      </div>
                      <span className="text-[14px] font-semibold text-[#e1e2ee]">Cursor / Agent Session</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.05em] text-[#869397]">Input Prompt</span>
                  </div>
                  <div className="p-3 rounded bg-[#272a33] font-mono text-[13px] text-[#e1e2ee] mb-3">
                    <p className="text-[#869397] text-[11px] mb-1">// User Prompt in Chat</p>
                    <p>"Write an idempotent migration to aggregate total refunds per customer. What foreign keys bind <span className="text-[#4cd7f6] font-semibold">customers</span> to <span className="text-[#4cd7f6] font-semibold">refunds</span>?"</p>
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px] text-[#bcc9cd]">
                    <div className="flex items-center gap-2 text-[#4edea3]">
                      <BadgeCheck size={14} />
                      <span>Intercepting via Model Context Protocol</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#869397]">
                      <RefreshCw size={14} />
                      <span>Routing to local stdio tool: <strong className="text-[#e1e2ee]">dbctx.join_path</strong></span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 bg-[#0b0e16] p-2.5 rounded flex items-center justify-between font-mono text-[11px] text-[#869397]">
                  <span>Direct DB credentials shared:</span>
                  <span className="text-[#4edea3] font-bold">0 (Air-Gapped)</span>
                </div>
              </div>

              <div className="md:col-span-7 p-4 rounded-lg bg-[#272a33] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch size={16} className="text-[#4cd7f6]" />
                      <span className="font-mono text-[13px] text-[#e1e2ee] font-semibold">dbctx join_path customers refunds</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#0b0e16] font-mono text-[11px] text-[#4edea3] font-bold">⚡ 2.1ms</span>
                  </div>
                  <pre className="font-mono text-[12px] text-[#bcc9cd] overflow-x-auto p-3 rounded bg-[#0b0e16] leading-relaxed terminal-scroll"><code>{`{
  "status": "resolved",
  "hop_count": 2,
  "path": [
    {
      "from": "customers.id",
      "to": "orders.customer_id",
      "fk_constraint": "fk_orders_customer"
    },
    {
      "from": "orders.id",
      "to": "refunds.order_id",
      "fk_constraint": "fk_refunds_order"
    }
  ],
  "tokens_injected": 148,
  "raw_introspection_avoided": "3,850 tokens"
}`}</code></pre>
                </div>
                <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-[#bcc9cd] pt-2">
                  <span className="flex items-center gap-1.5 text-[#4edea3]">
                    <span className="w-2 h-2 rounded-full bg-[#4edea3]" />
                    Exact traversal confirmed
                  </span>
                  <span className="text-[#869397]">No DB query fired</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── AGENT SIMULATION ─────────────────────────────────────────────────────────

const SIM_STEPS = [
  {
    title: "1. Agent Receives Prompt",
    leftBody: (
      <>
        <p className="text-[#869397] mb-2 font-mono text-[11px]">// User asks Claude / Cursor:</p>
        <p className="text-[#e1e2ee] font-mono text-[12px]">&quot;Write a migration adding refund reasons linked to specific customer disputes.&quot;</p>
        <div className="mt-4 text-[#ffb4ab] flex items-center gap-1.5 font-mono text-[11px]">
          <AlertTriangle size={14} />
          <span>Agent has no schema in prompt context. Stalling...</span>
        </div>
      </>
    ),
    rightBody: (
      <>
        <p className="text-[#869397] mb-2 font-mono text-[11px]">// User asks Claude / Cursor:</p>
        <p className="text-[#e1e2ee] font-mono text-[12px]">&quot;Write a migration adding refund reasons linked to specific customer disputes.&quot;</p>
        <div className="mt-4 text-[#4edea3] flex items-center gap-1.5 font-mono text-[11px]">
          <Zap size={14} />
          <span>MCP tool hooks detected: dbctx active via stdio.</span>
        </div>
      </>
    ),
    leftLat: "0ms", leftTok: "0 tokens",
    rightLat: "0ms", rightTok: "0 tokens",
  },
  {
    title: "2. Schema Inspection",
    leftBody: (
      <>
        <p className="text-[#ffb4ab] font-bold mb-2 font-mono text-[11px]">Executing 4 remote queries:</p>
        <p className="text-[#869397] font-mono text-[11px]">SELECT table_name FROM information_schema.tables;</p>
        <p className="text-[#869397] font-mono text-[11px]">SELECT column_name, data_type FROM information_schema.columns WHERE table_name = &apos;customers&apos;;</p>
        <p className="text-[#869397] font-mono text-[11px]">SELECT * FROM pg_constraint WHERE contype = &apos;f&apos;;</p>
        <div className="mt-3 text-[#ffb4ab] font-mono text-[11px]">⚠ Remote query pool lock on production RDS</div>
      </>
    ),
    rightBody: (
      <>
        <p className="text-[#4edea3] font-bold mb-2 font-mono text-[11px]">Local stdio tool call:</p>
        <p className="text-[#4cd7f6] font-mono text-[11px]">dbctx.describe_tables([&quot;customers&quot;, &quot;refunds&quot;, &quot;disputes&quot;])</p>
        <p className="mt-2 text-[#bcc9cd] font-mono text-[11px]">→ Disk hit: .dbctx/cache.json (hash: a9f81d)</p>
        <p className="mt-2 text-[#4edea3] font-bold font-mono text-[11px]">Done in 1.9ms. Zero network traffic.</p>
      </>
    ),
    leftLat: "980ms (Network roundtrips)", leftTok: "4,420 tokens",
    rightLat: "1.9ms (Local Disk)", rightTok: "172 tokens",
  },
  {
    title: "3. Token & Latency Cost",
    leftBody: (
      <div className="p-3 bg-[#ffb4ab]/10 rounded text-[#ffb4ab] space-y-1 font-mono text-[11px]">
        <p className="font-bold">Context Window Saturation:</p>
        <p>- 4,420 tokens injected into agent history</p>
        <p>- High probability of attention degradation</p>
        <p>- Remote DB roundtrips delay agent by ~1 second</p>
      </div>
    ),
    rightBody: (
      <div className="p-3 bg-[#4edea3]/10 rounded text-[#4edea3] space-y-1 font-mono text-[11px]">
        <p className="font-bold">Surgical Token Economy:</p>
        <p>- Only 172 tokens of minified schema injected</p>
        <p>- 96.1% tokens saved for business logic reasoning</p>
        <p>- Agent answers instantly without pausing</p>
      </div>
    ),
    leftLat: "1,120ms total", leftTok: "4,420 tokens",
    rightLat: "2.1ms total", rightTok: "172 tokens",
  },
  {
    title: "4. Generated SQL Output",
    leftBody: (
      <pre className="text-[#bcc9cd] font-mono text-[12px]"><code>{`-- Generated with hallucinations:
ALTER TABLE refunds
ADD COLUMN dispute_id INTEGER;
-- ERROR: disputes.id is UUID, not INTEGER!
-- Stale constraint name used.`}</code></pre>
    ),
    rightBody: (
      <pre className="text-[#e1e2ee] font-mono text-[12px]"><code>{`-- 100% Deterministic & Type-Safe:
ALTER TABLE refunds
ADD COLUMN dispute_id UUID
REFERENCES disputes(id) ON DELETE CASCADE;
CREATE INDEX idx_refunds_dispute
  ON refunds(dispute_id);`}</code></pre>
    ),
    leftLat: "1,240ms Total", leftTok: "4,420 tokens",
    rightLat: "2.1ms Total", rightTok: "172 tokens",
  },
];

function AgentSimSection() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setStep((s) => (s + 1) % SIM_STEPS.length), 2800);
    return () => clearInterval(id);
  }, [running]);

  const current = SIM_STEPS[step];

  return (
    <section id="agent-sim" className="w-full py-20 bg-[#0b0e16] relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <EyebrowBadge>
            <BarChart3 size={12} /> Live Agent Benchmark
          </EyebrowBadge>
          <SectionHeading>
            Watch How Coding Agents Work:{" "}
            <span className="text-[#4cd7f6]">With vs Without</span> schema-lens
          </SectionHeading>
          <SectionSubtitle>
            See the mechanical contrast between raw DB schema introspection and
            high-density deterministic MCP context.
          </SectionSubtitle>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {SIM_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => { setStep(i); setRunning(false); }}
              className={`px-4 py-2 rounded-lg font-mono text-[11px] transition-all ${
                i === step
                  ? "bg-[#272a33] text-[#4cd7f6] font-semibold shadow-sm"
                  : "bg-[#1d1f28] text-[#bcc9cd] hover:text-[#e1e2ee]"
              }`}
            >
              {s.title}
            </button>
          ))}
          <button
            onClick={() => setRunning((r) => !r)}
            className="ml-2 px-4 py-2 rounded-lg bg-[#4cd7f6] text-[#003640] font-semibold text-[14px] flex items-center gap-1.5 hover:bg-[#acedff] transition-all shadow-md shadow-[#4cd7f6]/20"
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
            <span>{running ? "Pause Simulation" : "Run Auto Simulation"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#1d1f28] p-6 shadow-lg flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#93000a]" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-[#ffb4ab]" />
                  <span className="text-[15px] font-semibold text-[#e1e2ee]">Standard Agent (Without schema-lens)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#ffb4ab]/10 text-[#ffb4ab] font-mono text-[11px] font-semibold">Slow & Risky</span>
              </div>
              <div className="p-4 rounded-lg bg-[#0b0e16] min-h-[200px] flex flex-col justify-center">
                {current.leftBody}
              </div>
            </div>
            <div className="mt-6 pt-4 bg-[#191b24] p-4 rounded-lg space-y-2">
              {[
                ["Introspection Latency:", current.leftLat, "text-[#ffb4ab]"],
                ["Tokens Consumed:", current.leftTok, "text-[#ffb4ab]"],
                ["Schema Fidelity:", "Hallucinated columns on drift", "text-[#ffb4ab]"],
              ].map(([k, v, c]) => (
                <div key={String(k)} className="flex justify-between items-center font-mono text-[11px]">
                  <span className="text-[#bcc9cd]">{k}</span>
                  <span className={`font-bold ${c}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[#272a33] p-6 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4cd7f6] to-[#4edea3]" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BadgeCheck size={18} className="text-[#4edea3]" />
                  <span className="text-[15px] font-semibold text-[#e1e2ee]">schema-lens MCP Agent (With dbctx)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#4edea3]/15 text-[#4edea3] font-mono text-[11px] font-semibold">Sub-3ms Deterministic</span>
              </div>
              <div className="p-4 rounded-lg bg-[#0b0e16] min-h-[200px] flex flex-col justify-center">
                {current.rightBody}
              </div>
            </div>
            <div className="mt-6 pt-4 bg-[#1d1f28] p-4 rounded-lg space-y-2">
              {[
                ["Introspection Latency:", current.rightLat, "text-[#4edea3]"],
                ["Tokens Consumed:", current.rightTok, "text-[#4edea3]"],
                ["Schema Fidelity:", "100% verified FKs & Types", "text-[#4edea3]"],
              ].map(([k, v, c]) => (
                <div key={String(k)} className="flex justify-between items-center font-mono text-[11px]">
                  <span className="text-[#bcc9cd]">{k}</span>
                  <span className={`font-bold ${c}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FEATURE MATRIX ───────────────────────────────────────────────────────────

function FeatureMatrixSection() {
  return (
    <section id="why" className="w-full py-20 bg-[#10131c] relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <EyebrowBadge>Core Architectural Advantages</EyebrowBadge>
          <SectionHeading>
            Built for Low Latency, Zero Leakage, and Zero Token Bloat
          </SectionHeading>
          <SectionSubtitle>
            LLMs should focus on generating high-order business logic, not parsing gigantic SQL catalog dumps.
          </SectionSubtitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-[#1d1f28] p-6 shadow-md flex flex-col justify-between group hover:bg-[#272a33] transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#272a33] group-hover:bg-[#32343e] flex items-center justify-center text-[#4cd7f6] mb-4 group-hover:scale-110 transition-transform">
                <PieChart size={22} />
              </div>
              <h3 className="text-[16px] font-semibold text-[#e1e2ee] mb-2">95.7% Token Savings</h3>
              <p className="font-mono text-[11px] text-[#bcc9cd] mb-4 leading-relaxed">
                Eliminate multi-thousand token <code className="text-[#4cd7f6]">information_schema</code> dumps. Feed compact, minified relational definitions straight into agent context.
              </p>
            </div>
            <div className="space-y-2 bg-[#0b0e16] p-3 rounded-lg">
              <div>
                <div className="flex justify-between font-mono text-[10px] text-[#869397] mb-1">
                  <span>Raw DB Dump</span><span className="text-[#ffb4ab] font-bold">4,200 tok</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#272a33] overflow-hidden">
                  <div className="h-full bg-[#ffb4ab] rounded-full w-[98%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-mono text-[10px] text-[#869397] mb-1">
                  <span>schema-lens</span><span className="text-[#4edea3] font-bold">180 tok</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#272a33] overflow-hidden">
                  <div className="h-full bg-[#4edea3] rounded-full w-[4.3%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#1d1f28] p-6 shadow-md flex flex-col justify-between group hover:bg-[#272a33] transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#272a33] group-hover:bg-[#32343e] flex items-center justify-center text-[#4cd7f6] mb-4 group-hover:scale-110 transition-transform">
                <Timer size={22} />
              </div>
              <h3 className="text-[16px] font-semibold text-[#e1e2ee] mb-2">Sub-3ms Local Reads</h3>
              <p className="font-mono text-[11px] text-[#bcc9cd] mb-4 leading-relaxed">
                Local cached snapshot read from memory-mapped disk storage. Coding on airplanes, trains, or offline staging envs works without interruption.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#0b0e16] flex items-center justify-between font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-[#e1e2ee]">
                <Plane size={14} className="text-[#4edea3]" /> Offline Ready
              </span>
              <span className="text-[#4cd7f6] font-bold">1.4ms AVG</span>
            </div>
          </div>

          <div className="rounded-xl bg-[#1d1f28] p-6 shadow-md flex flex-col justify-between group hover:bg-[#272a33] transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#272a33] group-hover:bg-[#32343e] flex items-center justify-center text-[#4cd7f6] mb-4 group-hover:scale-110 transition-transform">
                <Shield size={22} />
              </div>
              <h3 className="text-[16px] font-semibold text-[#e1e2ee] mb-2">Zero Database Risk</h3>
              <p className="font-mono text-[11px] text-[#bcc9cd] mb-4 leading-relaxed">
                Agents never touch live database connection strings, credentials, or pool connections. Snapshots are static, redacted, and air-gapped.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#0b0e16] flex items-center justify-between font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-[#869397]">
                <KeyRound size={14} className="text-[#adc6ff]" /> Live DB Access
              </span>
              <span className="text-[#4edea3] font-bold">PROHIBITED</span>
            </div>
          </div>

          <div className="rounded-xl bg-[#1d1f28] p-6 shadow-md flex flex-col justify-between group hover:bg-[#272a33] transition-all">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#272a33] group-hover:bg-[#32343e] flex items-center justify-center text-[#4cd7f6] mb-4 group-hover:scale-110 transition-transform">
                <RefreshCw size={22} />
              </div>
              <h3 className="text-[16px] font-semibold text-[#e1e2ee] mb-2">Auto-Fresh Drift Engine</h3>
              <p className="font-mono text-[11px] text-[#bcc9cd] mb-4 leading-relaxed">
                Watches Prisma, Drizzle, or raw SQL migrations. Instant SHA-256 fingerprint drift checks guarantee your agent never writes code against stale schemas.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#0b0e16] flex items-center justify-between font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-[#869397]">
                <Fingerprint size={14} className="text-[#4cd7f6]" /> Migration Hash
              </span>
              <span className="text-[#4cd7f6] font-bold">SYNCED</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── BENTO GRID ───────────────────────────────────────────────────────────────

function BentoSection() {
  return (
    <section id="features" className="w-full py-20 bg-[#0b0e16] relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <EyebrowBadge><LayoutGrid size={12} /> Capabilities Bento</EyebrowBadge>
          <SectionHeading>Engineered for Complex Relational Graphs</SectionHeading>
          <SectionSubtitle>
            PostgreSQL is more than simple table lists. schema-lens synthesizes foreign keys, JSONB structures, and enum definitions for instant agent digestion.
          </SectionSubtitle>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: FK Traversal wide */}
          <div className="md:col-span-2 rounded-xl bg-[#1d1f28] p-6 shadow-md flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitBranch size={18} className="text-[#4cd7f6]" />
                <span className="text-[15px] font-semibold text-[#e1e2ee]">Graph-Powered Relationship Traversal</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#32343e] font-mono text-[11px] text-[#4cd7f6]">BFS Shortest-Path</span>
            </div>
            <p className="font-mono text-[11px] text-[#bcc9cd] mb-4">
              Ask your agent how two disparate tables link together. <code className="text-[#4cd7f6]">dbctx</code> computes the optimal join sequence across foreign key chains instantly.
            </p>
            <div className="rounded-lg bg-[#0b0e16] p-4 overflow-x-auto mt-auto">
              <div className="flex items-center justify-between min-w-[480px] gap-2 py-3">
                {[
                  { name: "users", badge: "PK", col0: "id: uuid", col1: "email: text", col2: "org_id: uuid", fk: "user_id", col2color: "" },
                  { name: "orders", badge: "PK/FK", col0: "id: uuid", col1: "user_id: uuid", col2: "total: numeric", fk: "order_id", col2color: "text-[#adc6ff]" },
                  { name: "order_items", badge: "FK", col0: "id: uuid", col1: "order_id: uuid", col2: "product_id: uuid", fk: null, col2color: "text-[#adc6ff]" },
                ].map((node) => (
                  <React.Fragment key={node.name}>
                    <div className="p-3 rounded-lg bg-[#272a33] shadow-md w-36 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11px] font-bold text-[#e1e2ee]">{node.name}</span>
                        <span className="font-mono text-[10px] text-[#4edea3]">{node.badge}</span>
                      </div>
                      <div className="space-y-0.5 font-mono text-[10px] text-[#869397]">
                        <div className="text-[#4cd7f6]">{node.col0}</div>
                        <div>{node.col1}</div>
                        <div className={node.col2color}>{node.col2}</div>
                      </div>
                    </div>
                    {node.fk && (
                      <div className="flex flex-col items-center justify-center flex-shrink-0">
                        <span className="font-mono text-[10px] text-[#4cd7f6] mb-1">{node.fk}</span>
                        <div className="h-0.5 w-10 bg-[#4cd7f6]" />
                        <ChevronRight size={12} className="text-[#4cd7f6] -mt-0.5" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-2 bg-[#1d1f28] p-2 rounded font-mono text-[11px] flex items-center justify-between">
                <span className="text-[#e1e2ee]">Path: users → orders → order_items</span>
                <span className="text-[#4edea3] font-bold">Resolved in 1.1ms</span>
              </div>
            </div>
          </div>

          {/* Card 2: Deep Type Awareness */}
          <div className="rounded-xl bg-[#1d1f28] p-6 shadow-md flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Database size={18} className="text-[#adc6ff]" />
              <h3 className="text-[15px] font-semibold text-[#e1e2ee]">Deep Type Awareness</h3>
            </div>
            <p className="font-mono text-[11px] text-[#bcc9cd] mb-4">
              Understands enums, JSONB structures, domain types, and Postgres-specific extensions without ambiguity.
            </p>
            <div className="grid grid-cols-2 gap-2 bg-[#0b0e16] p-3 rounded-lg font-mono text-[11px] mt-auto">
              {[
                { label: "Enums", value: "role_type", color: "text-[#4cd7f6]" },
                { label: "Composite", value: "address_t", color: "text-[#adc6ff]" },
                { label: "JSONB Keys", value: "metadata.*", color: "text-[#4edea3]" },
                { label: "Index Engine", value: "GIN, B-Tree", color: "text-[#4cd7f6]" },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-2 rounded bg-[#1d1f28]">
                  <span className="text-[10px] text-[#869397] block uppercase">{label}</span>
                  <span className={color}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Index Advisor */}
          <div className="rounded-xl bg-[#1d1f28] p-6 shadow-md flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={18} className="text-[#4edea3]" />
              <h3 className="text-[15px] font-semibold text-[#e1e2ee]">Index Advisor</h3>
            </div>
            <p className="font-mono text-[11px] text-[#bcc9cd] mb-4">
              Informs coding agents whether proposed <code className="text-[#4cd7f6]">WHERE</code> filters hit an existing index or risk triggering expensive sequential table scans.
            </p>
            <div className="p-3 rounded-lg bg-[#0b0e16] font-mono text-[11px] text-[#bcc9cd] space-y-1 mt-auto">
              <div className="flex items-center justify-between text-[#4edea3]">
                <span>idx_orders_created_at</span><span className="text-[10px] uppercase">Indexed</span>
              </div>
              <div className="flex items-center justify-between text-[#869397]">
                <span>notes_search_vector</span><span className="text-[10px] text-[#adc6ff]">GIN Index</span>
              </div>
            </div>
          </div>

          {/* Card 4: Multi-DB Profiles wide */}
          <div className="md:col-span-2 rounded-xl bg-[#1d1f28] p-6 shadow-md flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-[#4cd7f6]" />
                <span className="text-[15px] font-semibold text-[#e1e2ee]">Multi-Database Profile Switching</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#32343e] font-mono text-[11px] text-[#869397]">Zero Config</span>
            </div>
            <p className="font-mono text-[11px] text-[#bcc9cd] mb-4">
              Toggle between <code className="text-[#4cd7f6]">local_dev</code>, <code className="text-[#4cd7f6]">staging</code>, or branch environments with a single flag. Agents instantly adapt without restarting MCP sessions.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0b0e16] p-3 rounded-lg font-mono text-[11px] mt-auto">
              <div className="p-2.5 rounded bg-[#272a33] text-[#e1e2ee] flex items-center justify-between">
                <span>profile: default</span><span className="w-2 h-2 rounded-full bg-[#4edea3]" />
              </div>
              <div className="p-2.5 rounded bg-[#1d1f28] text-[#869397] flex items-center justify-between">
                <span>profile: staging</span><span className="w-2 h-2 rounded-full bg-[#869397]" />
              </div>
              <div className="p-2.5 rounded bg-[#1d1f28] text-[#869397] flex items-center justify-between">
                <span>profile: branch_v2</span><span className="w-2 h-2 rounded-full bg-[#869397]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PLAYGROUND ───────────────────────────────────────────────────────────────

const SCENARIOS = {
  join_path: {
    label: "Join Path (FK BFS)",
    cli: `$ dbctx join_path users order_items\n\n  Found shortest FK traversal path (2 hops):\n  users.id  -->  orders.customer_id  [fk_orders_customer]\n  orders.id -->  order_items.order_id   [fk_items_order]\n\n⚡ executed in 1.8ms | 0 db roundtrips | cache hit`,
    mcp: `{\n  "jsonrpc": "2.0",\n  "result": {\n    "source": "users",\n    "target": "order_items",\n    "hops": 2,\n    "path": [\n      {"from": "users.id", "to": "orders.customer_id"},\n      {"from": "orders.id", "to": "order_items.order_id"}\n    ]\n  }\n}`,
    llm: `### Schema Lens FK Traversal\n- **Source Table**: \`users\`\n- **Target Table**: \`order_items\`\n- **Join Path**:\n  \`users JOIN orders ON users.id = orders.customer_id\`\n  \`JOIN order_items ON orders.id = order_items.order_id\``,
    time: "⚡ 1.8ms",
  },
  list_tables: {
    label: "List Tables",
    cli: `$ dbctx tables\n\n  Found 14 tables in schema 'public':\n  - users (id, email, org_id, created_at)\n  - orgs (id, name, tier)\n  - orders (id, customer_id, total, status)\n  - order_items (id, order_id, product_id, qty)\n  - products (id, title, price_cents)\n  ... +9 more tables\n\n⚡ executed in 0.9ms`,
    mcp: `{\n  "jsonrpc": "2.0",\n  "result": {\n    "tables": ["users", "orgs", "orders", "order_items", "products"],\n    "total_count": 14,\n    "schema_hash": "a9f81d"\n  }\n}`,
    llm: `### Tables in Context\n\`users\`, \`orgs\`, \`orders\`, \`order_items\`, \`products\`\n*All relations verified against local snapshot.*`,
    time: "⚡ 0.9ms",
  },
  describe_table: {
    label: "Describe Schema",
    cli: `$ dbctx describe orders\n\nTable: public.orders (UUID primary key)\nColumns:\n  - id            uuid        NOT NULL PK\n  - customer_id   uuid        NOT NULL FK -> users.id\n  - status        order_status NOT NULL DEFAULT 'pending'\n  - amount_cents  integer     NOT NULL\n  - created_at    timestamptz DEFAULT now()\nIndexes:\n  - idx_orders_customer_id ON orders(customer_id)\n\n⚡ executed in 1.2ms`,
    mcp: `{\n  "table": "orders",\n  "primary_key": ["id"],\n  "foreign_keys": [\n    {"column": "customer_id", "references": "users(id)"}\n  ],\n  "enums": {"status": ["pending", "shipped", "refunded"]}\n}`,
    llm: `### Table: \`orders\`\n- **id**: \`uuid\` (PK)\n- **customer_id**: \`uuid\` (FK to \`users.id\`)\n- **status**: enum \`order_status\`\n- **amount_cents**: \`integer\``,
    time: "⚡ 1.2ms",
  },
  fuzzy_search: {
    label: "Fuzzy Column Search",
    cli: `$ dbctx search "billing"\n\n  Found 3 matches across columns:\n  - customers.billing_address_id (FK -> addresses.id)\n  - subscriptions.billing_cycle   (enum: monthly|annual)\n  - invoices.billing_email        (text)\n\n⚡ executed in 1.4ms`,
    mcp: `{\n  "query": "billing",\n  "matches": [\n    {"table": "customers", "column": "billing_address_id"},\n    {"table": "subscriptions", "column": "billing_cycle"},\n    {"table": "invoices", "column": "billing_email"}\n  ]\n}`,
    llm: `### Columns Matching "billing"\n1. \`customers.billing_address_id\`\n2. \`subscriptions.billing_cycle\`\n3. \`invoices.billing_email\``,
    time: "⚡ 1.4ms",
  },
} as const;

type ScenarioKey = keyof typeof SCENARIOS;
type FormatKey = "cli" | "mcp" | "llm";

function PlaygroundSection() {
  const [scenario, setScenario] = useState<ScenarioKey>("join_path");
  const [format, setFormat] = useState<FormatKey>("cli");
  const current = SCENARIOS[scenario];
  const code = current[format];
  const { copied, copy } = useCopyButton(code);

  return (
    <section id="playground" className="w-full py-20 bg-[#10131c] relative">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <EyebrowBadge>Live Explorer</EyebrowBadge>
          <SectionHeading>Interactive Query Playground</SectionHeading>
          <SectionSubtitle>
            Click through live commands to preview how schema-lens responds in terminal and MCP protocol streams.
          </SectionSubtitle>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SCENARIOS) as ScenarioKey[]).map((s) => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[11px] transition-all ${
                  s === scenario ? "bg-[#32343e] text-[#4cd7f6] font-semibold" : "bg-[#1d1f28] text-[#bcc9cd] hover:text-[#e1e2ee]"
                }`}
              >
                {SCENARIOS[s].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-[#191b24] p-1 rounded-lg">
            {(["cli", "mcp", "llm"] as FormatKey[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1 rounded font-mono text-[11px] transition-all ${
                  f === format ? "bg-[#272a33] text-[#e1e2ee] font-semibold" : "text-[#869397] hover:text-[#e1e2ee]"
                }`}
              >
                {f === "cli" ? "CLI View" : f === "mcp" ? "MCP JSON" : "Agent Markdown"}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-[#0b0e16] shadow-2xl overflow-hidden">
          <TerminalChrome
            title="dbctx v0.1.4 — playground"
            right={
              <>
                <span className="font-mono text-[11px] text-[#4edea3] font-bold">{current.time}</span>
                <button onClick={copy} className="text-[#869397] hover:text-[#e1e2ee] transition-colors flex items-center gap-1 font-mono text-[11px]">
                  {copied ? <Check size={14} className="text-[#4edea3]" /> : <Copy size={14} />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </>
            }
          />
          <div className="p-6 overflow-x-auto min-h-[220px] terminal-scroll">
            <pre className="font-mono text-[13px] text-[#e1e2ee] leading-relaxed whitespace-pre-wrap"><code>{code}</code></pre>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SETUP ────────────────────────────────────────────────────────────────────

const AGENT_CONFIGS = {
  claude: {
    label: "Claude Desktop",
    path: "~/Library/Application Support/Claude/claude_desktop_config.json",
    json: `{\n  "mcpServers": {\n    "dbctx": {\n      "command": "npx",\n      "args": ["@jaydeepramanuj/schema-lens", "mcp-serve"]\n    }\n  }\n}`,
  },
  cursor: {
    label: "Cursor",
    path: ".cursor/mcp.json",
    json: `{\n  "mcpServers": {\n    "dbctx": {\n      "command": "npx",\n      "args": ["@jaydeepramanuj/schema-lens", "mcp-serve"]\n    }\n  }\n}`,
  },
  antigravity: {
    label: "Antigravity / Gemini",
    path: "~/.config/antigravity/tools.json",
    json: `{\n  "tools": [\n    {\n      "name": "schema-lens",\n      "type": "stdio",\n      "command": "npx @jaydeepramanuj/schema-lens mcp-serve"\n    }\n  ]\n}`,
  },
  windsurf: {
    label: "Windsurf / Copilot",
    path: "~/.codeium/windsurf/mcp_config.json",
    json: `{\n  "mcpServers": {\n    "dbctx": {\n      "command": "npx",\n      "args": ["@jaydeepramanuj/schema-lens", "mcp-serve"]\n    }\n  }\n}`,
  },
} as const;

type AgentKey = keyof typeof AGENT_CONFIGS;

function SetupSection() {
  const [agent, setAgent] = useState<AgentKey>("claude");
  const current = AGENT_CONFIGS[agent];
  const { copied, copy } = useCopyButton(current.json);

  return (
    <section id="setup" className="w-full py-20 bg-[#0b0e16] relative">
      <div className="max-w-5xl mx-auto px-6 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <EyebrowBadge>Integration Guide</EyebrowBadge>
          <SectionHeading>The 60-Second Setup</SectionHeading>
          <SectionSubtitle>
            Add schema-lens to your coding agent configuration and give it immediate relational awareness.
          </SectionSubtitle>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {(Object.keys(AGENT_CONFIGS) as AgentKey[]).map((a) => (
            <button
              key={a}
              onClick={() => setAgent(a)}
              className={`px-4 py-2 rounded-lg font-mono text-[11px] transition-all ${
                a === agent ? "bg-[#272a33] text-[#4cd7f6] font-semibold" : "bg-[#1d1f28] text-[#bcc9cd] hover:text-[#e1e2ee]"
              }`}
            >
              {AGENT_CONFIGS[a].label}
            </button>
          ))}
        </div>
        <div className="rounded-xl bg-[#1d1f28] shadow-xl overflow-hidden mb-6">
          <TerminalChrome
            title={current.path}
            right={
              <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b0e16] text-[#bcc9cd] hover:text-[#e1e2ee] font-mono text-[11px] transition-colors">
                {copied ? <Check size={12} className="text-[#4edea3]" /> : <Copy size={12} />}
                <span>{copied ? "Copied!" : "Copy Config"}</span>
              </button>
            }
          />
          <div className="p-6 bg-[#0b0e16] overflow-x-auto">
            <pre className="font-mono text-[13px] text-[#e1e2ee] leading-relaxed whitespace-pre-wrap"><code>{current.json}</code></pre>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { n: "1", title: "Generate Snapshot", body: <>Run <code className="text-[#4cd7f6] font-mono text-[11px]">npx dbctx init</code> with your connection URL once.</> },
            { n: "2", title: "Add MCP Config", body: "Paste the 5 lines of JSON above into your agent configuration." },
            { n: "3", title: "Zero Hallucinations", body: `Ask questions: "How does invoice link to billing address?"` },
          ].map(({ n, title, body }) => (
            <div key={n} className="p-4 rounded-lg bg-[#1d1f28] flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#4cd7f6]/20 text-[#4cd7f6] flex items-center justify-center font-bold text-[12px] flex-shrink-0 mt-0.5">{n}</div>
              <div>
                <span className="font-mono text-[11px] font-bold text-[#e1e2ee] block mb-1">{title}</span>
                <span className="font-mono text-[11px] text-[#bcc9cd]">{body}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── BOTTOM CTA ───────────────────────────────────────────────────────────────

function BottomCTA() {
  const { copied, copy } = useCopyButton("npm i -g @jaydeepramanuj/schema-lens");
  return (
    <section className="w-full py-20 bg-[#10131c] relative overflow-hidden">
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-[#4cd7f6]/10 rounded-full blur-[160px]" />
      <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#272a33] mb-6">
          <BadgeCheck size={14} className="text-[#4edea3]" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.05em] text-[#bcc9cd]">100% Free & Open Source (MIT)</span>
        </div>
        <h2 className="text-3xl md:text-[48px] font-bold leading-[1.15] tracking-[-0.025em] text-[#e1e2ee] mb-4">
          Give your AI coding agent instant PostgreSQL awareness.
        </h2>
        <p className="text-[18px] leading-[28px] text-[#bcc9cd] max-w-xl mx-auto mb-10">
          Stop burning tokens on endless catalog queries. Cache locally, query deterministically, and code at the speed of thought.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
          <button onClick={copy} className="flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#4cd7f6] text-[#003640] font-semibold text-[14px] shadow-lg shadow-[#4cd7f6]/25 hover:bg-[#acedff] transition-all">
            {copied ? <Check size={16} /> : <Terminal size={16} />}
            <span>{copied ? "Copied!" : "npm i -g @jaydeepramanuj/schema-lens"}</span>
          </button>
          <a href="https://github.com/JaydeepRamanuj/schema-lens" target="_blank" rel="noopener" className="flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#272a33] hover:bg-[#32343e] text-[#e1e2ee] font-semibold text-[14px] transition-colors">
            <Star size={16} className="text-[#4cd7f6]" />
            <span>Star on GitHub (1.2k)</span>
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-[11px] text-[#869397]">
          {["MCP 1.0 Spec", "PostgreSQL 12 – 17", "Supabase & Neon Tested", "Zero Telemetry Leakage"].map((b) => (
            <span key={b} className="flex items-center gap-1.5">
              <BadgeCheck size={14} className="text-[#4edea3]" />{b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="w-full bg-[#0b0e16] py-16 shadow-[0_-1px_12px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded bg-[#1d1f28] flex items-center justify-center">
                <Database size={14} className="text-[#4cd7f6]" />
              </div>
              <span className="text-[16px] font-semibold text-[#e1e2ee] tracking-tight">schema-lens</span>
            </div>
            <p className="font-mono text-[11px] text-[#bcc9cd] max-w-sm mb-4 leading-relaxed">
              Deterministic relational schema compression and context synthesizers for autonomous AI coding agents.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#1d1f28] font-mono text-[11px] text-[#4cd7f6]">
              <span>$</span><span className="text-[#e1e2ee]">npm i -g @jaydeepramanuj/schema-lens</span>
            </div>
          </div>
          {[
            {
              heading: "Product",
              links: [["Agent Simulation", "#agent-sim"], ["Feature Matrix", "#why"], ["Playground", "#playground"], ["Telemetry Benchmarks", "#why"]],
            },
            {
              heading: "Ecosystem",
              links: [["MCP Server Spec", "/docs/intro"], ["Cursor Integration", "#setup"], ["Claude Desktop", "#setup"], ["Antigravity Adapter", "#setup"]],
            },
            {
              heading: "Community",
              links: [["GitHub", "https://github.com/JaydeepRamanuj/schema-lens"], ["Discord", "https://discord.com"], ["X (Twitter)", "https://twitter.com"], ["Security Policy", "/docs/intro"]],
            },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.05em] text-[#869397] mb-3">{heading}</div>
              <ul className="space-y-2 font-mono text-[11px]">
                {links.map(([l, h]) => (
                  <li key={l}>
                    <a href={h} className="text-[#bcc9cd] hover:text-[#e1e2ee] transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-[#1d1f28] flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-[11px] text-[#bcc9cd]">
          <p>© 2026 schema-lens • MIT Licensed • Built for the MCP Ecosystem</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-[#4edea3]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" /> All Systems Operational
            </span>
            <span className="text-[#869397]">SHA: 4cd7f6a</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="overflow-hidden bg-[#10131c]" style={{ fontFamily: 'var(--font-geist), Inter, system-ui, sans-serif' }}>
      <Header />
      <HeroSection />
      <AgentSimSection />
      <FeatureMatrixSection />
      <BentoSection />
      <PlaygroundSection />
      <SetupSection />
      <BottomCTA />
      <Footer />
    </div>
  );
}
