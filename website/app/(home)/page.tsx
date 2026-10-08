"use client";
import React from 'react';
import Link from 'next/link';
import InteractiveTerminal from '../../components/InteractiveTerminal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';

function HeroSection() {
  return (
    <header className="relative py-24 text-left bg-transparent overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-[10%] left-[20%] w-[50vw] h-[50vw] bg-[radial-gradient(circle,rgba(34,211,238,0.15)_0%,rgba(0,0,0,0)_70%)] rounded-full pointer-events-none z-0" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] bg-[radial-gradient(circle,rgba(59,130,246,0.1)_0%,rgba(0,0,0,0)_70%)] rounded-full pointer-events-none z-0" />

      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 min-[996px]:grid-cols-[1.2fr_1fr] gap-16 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.05] mb-6 tracking-tight text-white">
              Stop guessing your schema.<br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Let your AI agent look it up.
              </span>
            </h1>
            <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
              schema-lens caches your PostgreSQL schema locally and serves accurate answers in milliseconds — no SQL, no round-trips, no hallucinated column names.
            </p>
            <div className="flex gap-4">
              <Link
                className="px-8 py-3 text-lg rounded-full font-semibold text-white bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_4px_14px_rgba(6,182,212,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(6,182,212,0.6)] transition-all duration-200"
                href="/docs/intro">
                Get Started
              </Link>
              <Link
                className="px-8 py-3 text-lg rounded-full font-semibold text-white bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                href="https://github.com/jdr-topia/schema-lens">
                View on GitHub
              </Link>
            </div>
          </div>
          <div>
            <div className="relative font-mono rounded-xl bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] before:absolute before:-inset-px before:rounded-xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:-z-10 before:pointer-events-none">
              <div className="p-4 flex items-center gap-2 border-b border-white/5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>
              <div className="p-6 text-zinc-200 text-sm leading-relaxed space-y-2">
                <p><code>$ dbctx init</code></p>
                <p className="text-green-400">✔ Schema cached successfully.</p>
                <p><code>$ dbctx tables</code></p>
                <p className="text-zinc-400">users, posts, comments, profiles</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function SetupSection() {
  const mcpConfig = `{
  "mcpServers": {
    "dbctx": {
      "command": "npx",
      "args": ["dbctx", "mcp-serve"]
    }
  }
}`;

  return (
    <section className="py-16 relative z-10">
      <div className="container max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-2">The 60-Second Setup</h2>
        <p className="text-center mb-8 text-zinc-400">Add dbctx to your agent's MCP config and give it instant schema awareness.</p>
        <div className="max-w-[800px] mx-auto">
          <Tabs defaultValue="claude" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="claude">Claude Desktop</TabsTrigger>
              <TabsTrigger value="cursor">Cursor</TabsTrigger>
              <TabsTrigger value="antigravity">Antigravity</TabsTrigger>
            </TabsList>
            <TabsContent value="claude">
              <div className="relative font-mono rounded-xl bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] before:absolute before:-inset-px before:rounded-xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:-z-10 before:pointer-events-none">
                <div className="p-4 flex items-center border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  </div>
                  <span className="text-xs text-zinc-400 font-mono ml-3">claude_desktop_config.json</span>
                </div>
                <div className="p-6 text-zinc-200 text-sm leading-relaxed">
                  <pre className="text-sm text-zinc-300 font-mono overflow-x-auto"><code>{mcpConfig}</code></pre>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="cursor">
              <div className="relative font-mono rounded-xl bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] before:absolute before:-inset-px before:rounded-xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:-z-10 before:pointer-events-none">
                <div className="p-4 flex items-center border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  </div>
                  <span className="text-xs text-zinc-400 font-mono ml-3">cursor-mcp-settings</span>
                </div>
                <div className="p-6 text-zinc-200 text-sm leading-relaxed">
                  <p className="text-sm text-zinc-400 mb-2 font-mono">// Add the following as an MCP server command in Cursor settings:</p>
                  <pre className="text-sm text-zinc-300 font-mono"><code>npx dbctx mcp-serve</code></pre>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="antigravity">
              <div className="relative font-mono rounded-xl bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] before:absolute before:-inset-px before:rounded-xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:-z-10 before:pointer-events-none">
                <div className="p-4 flex items-center border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  </div>
                  <span className="text-xs text-zinc-400 font-mono ml-3">mcp.json</span>
                </div>
                <div className="p-6 text-zinc-200 text-sm leading-relaxed">
                  <pre className="text-sm text-zinc-300 font-mono overflow-x-auto"><code>{mcpConfig}</code></pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="py-16 relative z-10 overflow-hidden">
      <div className="absolute top-[10%] -left-[10%] w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(168,85,247,0.08)_0%,rgba(0,0,0,0)_70%)] rounded-full pointer-events-none z-0" />
      <div className="container max-w-6xl mx-auto px-4 relative z-10">
        <h2 className="text-3xl font-bold text-center mb-10">Why schema-lens?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-10 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] group before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_60%)] before:opacity-0 before:transition-opacity duration-300 before:pointer-events-none hover:before:opacity-100">
            <h3 className="text-xl font-bold text-red-500 mb-4">Without schema-lens</h3>
            <ul className="list-none p-0 mt-6 space-y-4 text-zinc-300 text-[1.05rem]">
              <li>❌ AI agents write slow <code>SELECT</code> queries</li>
              <li>❌ High latency due to network round-trips</li>
              <li>❌ Agents hallucinate column names or relationships</li>
              <li>❌ Exposes raw database access to AI</li>
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.05] to-transparent backdrop-blur-md p-10 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_10px_40px_-10px_rgba(34,211,238,0.15)] group before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_60%)] before:opacity-0 before:transition-opacity duration-300 before:pointer-events-none hover:before:opacity-100">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">With schema-lens</h3>
            <ul className="list-none p-0 mt-6 space-y-4 text-zinc-300 text-[1.05rem]">
              <li>✅ Instant schema reading via local cache</li>
              <li>✅ Millisecond response times</li>
              <li>✅ 100% accurate tables, columns, and foreign keys</li>
              <li>✅ Read-only, secure, and isolated from your live DB</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-16 relative z-10">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-10 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] group before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_60%)] before:opacity-0 before:transition-opacity duration-300 before:pointer-events-none hover:before:opacity-100">
            <div className="text-5xl mb-6 drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]">🚀</div>
            <h3 className="text-xl font-bold text-white mb-4">Offline-Capable</h3>
            <p className="text-zinc-400 leading-relaxed m-0">Serves schema answers directly from a local JSON snapshot. No active database connection required during generation.</p>
          </div>
          <div className="text-center relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-10 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] group before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_60%)] before:opacity-0 before:transition-opacity duration-300 before:pointer-events-none hover:before:opacity-100">
            <div className="text-5xl mb-6 drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]">⚡</div>
            <h3 className="text-xl font-bold text-white mb-4">Millisecond Reads</h3>
            <p className="text-zinc-400 leading-relaxed m-0">Because there are no network round-trips to the DB, agents get context back instantly, drastically speeding up coding sessions.</p>
          </div>
          <div className="text-center relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-10 transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] group before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_60%)] before:opacity-0 before:transition-opacity duration-300 before:pointer-events-none hover:before:opacity-100">
            <div className="text-5xl mb-6 drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]">🔄</div>
            <h3 className="text-xl font-bold text-white mb-4">Auto-Fresh</h3>
            <p className="text-zinc-400 leading-relaxed m-0">Fingerprint drift detection automatically warns you or refreshes the cache when your real database schema changes.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 mt-16 py-12">
      <div className="container max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-zinc-400 text-sm">
          &copy; {new Date().getFullYear()} schema-lens. MIT Licensed.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/docs/intro" className="text-zinc-400 hover:text-cyan-400 transition-colors text-sm font-medium">
            Documentation
          </Link>
          <Link href="https://github.com/jdr-topia/schema-lens" className="text-zinc-400 hover:text-cyan-400 transition-colors text-sm font-medium">
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="overflow-hidden">
      <HeroSection />
      <main>
        <SetupSection />
        <InteractiveTerminal />
        <ComparisonSection />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
}
