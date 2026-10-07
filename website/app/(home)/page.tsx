"use client";
import React from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import InteractiveTerminal from '../../components/InteractiveTerminal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';

import styles from './index.module.css';

function HeroSection() {
  return (
    <header className={clsx('relative', styles.heroBanner)}>
      {/* Ambient background glows */}
      <div className={styles.glowCyan}></div>
      <div className={styles.glowBlue}></div>

      <div className="container max-w-6xl mx-auto px-4" style={{ position: 'relative', zIndex: 1 }}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              Stop guessing your schema.<br />
              <span className={styles.heroTitleAccent}>Let your AI agent look it up.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              schema-lens caches your PostgreSQL schema locally and serves accurate answers in milliseconds — no SQL, no round-trips, no hallucinated column names.
            </p>
            <div className={styles.buttons}>
              <Link
                className={clsx('px-8 py-3 text-lg rounded-full', styles.buttonPrimaryGlow)}
                href="/docs/intro">
                Get Started
              </Link>
              <Link
                className={clsx('px-8 py-3 text-lg rounded-full', styles.buttonGlass)}
                href="https://github.com/jdr-topia/schema-lens">
                View on GitHub
              </Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.terminalWindow}>
              <div className={styles.terminalHeader}>
                <span className={styles.terminalDot} style={{ backgroundColor: '#ff5f56' }}></span>
                <span className={styles.terminalDot} style={{ backgroundColor: '#ffbd2e' }}></span>
                <span className={styles.terminalDot} style={{ backgroundColor: '#27c93f' }}></span>
              </div>
              <div className={styles.terminalBody}>
                <p><code>$ dbctx init</code></p>
                <p style={{ color: '#4ade80' }}>✔ Schema cached successfully.</p>
                <p><code>$ dbctx tables</code></p>
                <p style={{ color: '#a1a1aa' }}>users, posts, comments, profiles</p>
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
    <section className={styles.setupSection}>
      <div className="container max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-2">The 60-Second Setup</h2>
        <p className="text-center mb-8 text-zinc-400">Add dbctx to your agent's MCP config and give it instant schema awareness.</p>
        <div className={styles.tabsContainer}>
          <Tabs defaultValue="claude" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="claude">Claude Desktop</TabsTrigger>
              <TabsTrigger value="cursor">Cursor</TabsTrigger>
              <TabsTrigger value="antigravity">Antigravity</TabsTrigger>
            </TabsList>
            <TabsContent value="claude" className="mt-4">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <p className="text-sm text-zinc-400 mb-2">claude_desktop_config.json</p>
                <pre className="text-sm text-zinc-300"><code>{mcpConfig}</code></pre>
              </div>
            </TabsContent>
            <TabsContent value="cursor" className="mt-4">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <p className="text-sm text-zinc-400 mb-2">Add the following as an MCP server command in Cursor settings:</p>
                <pre className="text-sm text-zinc-300"><code>npx dbctx mcp-serve</code></pre>
              </div>
            </TabsContent>
            <TabsContent value="antigravity" className="mt-4">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <p className="text-sm text-zinc-400 mb-2">mcp.json</p>
                <pre className="text-sm text-zinc-300"><code>{mcpConfig}</code></pre>
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
    <section className={styles.comparisonSection}>
      <div className={styles.glowPurple}></div>
      <div className="container max-w-6xl mx-auto px-4" style={{ position: 'relative', zIndex: 1 }}>
        <h2 className="text-3xl font-bold text-center mb-10">Why schema-lens?</h2>
        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonCard}>
            <h3 className="text-xl font-bold text-red-500 mb-4">Without schema-lens</h3>
            <ul className={styles.comparisonList}>
              <li>❌ AI agents write slow <code>SELECT</code> queries</li>
              <li>❌ High latency due to network round-trips</li>
              <li>❌ Agents hallucinate column names or relationships</li>
              <li>❌ Exposes raw database access to AI</li>
            </ul>
          </div>
          <div className={clsx(styles.comparisonCard, styles.comparisonCardHighlight)}>
            <h3 className="text-xl font-bold text-cyan-400 mb-4">With schema-lens</h3>
            <ul className={styles.comparisonList}>
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
    <section className={styles.featuresSection}>
      <div className="container max-w-6xl mx-auto px-4">
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚀</div>
            <h3 className="text-xl font-bold">Offline-Capable</h3>
            <p>Serves schema answers directly from a local JSON snapshot. No active database connection required during generation.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3 className="text-xl font-bold">Millisecond Reads</h3>
            <p>Because there are no network round-trips to the DB, agents get context back instantly, drastically speeding up coding sessions.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔄</div>
            <h3 className="text-xl font-bold">Auto-Fresh</h3>
            <p>Fingerprint drift detection automatically warns you or refreshes the cache when your real database schema changes.</p>
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
    <div style={{ overflow: 'hidden' }}>
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
