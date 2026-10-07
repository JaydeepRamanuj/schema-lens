import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

function HeroSection() {
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      {/* Ambient background glows */}
      <div className={styles.glowCyan}></div>
      <div className={styles.glowBlue}></div>

      <div className="container" style={{position: 'relative', zIndex: 1}}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <Heading as="h1" className={styles.heroTitle}>
              Stop guessing your schema.<br/>
              <span className={styles.heroTitleAccent}>Let your AI agent look it up.</span>
            </Heading>
            <p className={styles.heroSubtitle}>
              schema-lens caches your PostgreSQL schema locally and serves accurate answers in milliseconds — no SQL, no round-trips, no hallucinated column names.
            </p>
            <div className={styles.buttons}>
              <Link
                className={clsx('button button--lg', styles.buttonPrimaryGlow)}
                to="/docs/intro">
                Get Started
              </Link>
              <Link
                className={clsx('button button--lg', styles.buttonGlass)}
                href="https://github.com/jdr-topia/schema-lens">
                View on GitHub
              </Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.terminalWindow}>
              <div className={styles.terminalHeader}>
                <span className={styles.terminalDot} style={{backgroundColor: '#ff5f56'}}></span>
                <span className={styles.terminalDot} style={{backgroundColor: '#ffbd2e'}}></span>
                <span className={styles.terminalDot} style={{backgroundColor: '#27c93f'}}></span>
              </div>
              <div className={styles.terminalBody}>
                <p><code>$ dbctx init</code></p>
                <p style={{color: '#4ade80'}}>✔ Schema cached successfully.</p>
                <p><code>$ dbctx tables</code></p>
                <p style={{color: '#a1a1aa'}}>users, posts, comments, profiles</p>
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
      <div className="container">
        <Heading as="h2" className="text--center">The 60-Second Setup</Heading>
        <p className="text--center margin-bottom--lg" style={{color: 'hsl(var(--muted-foreground))'}}>Add dbctx to your agent's MCP config and give it instant schema awareness.</p>
        <div className={styles.tabsContainer}>
          <Tabs className={styles.customTabs}>
            <TabItem value="claude" label="Claude Desktop" default>
              <CodeBlock language="json" title="claude_desktop_config.json">{mcpConfig}</CodeBlock>
            </TabItem>
            <TabItem value="cursor" label="Cursor">
              <p style={{marginTop: '1rem'}}>Add the following as an MCP server command in Cursor settings:</p>
              <CodeBlock language="bash">npx dbctx mcp-serve</CodeBlock>
            </TabItem>
            <TabItem value="antigravity" label="Antigravity">
              <CodeBlock language="json" title="mcp.json">{mcpConfig}</CodeBlock>
            </TabItem>
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
      <div className="container" style={{position: 'relative', zIndex: 1}}>
        <Heading as="h2" className="text--center margin-bottom--lg">Why schema-lens?</Heading>
        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonCard}>
            <Heading as="h3" style={{color: '#ef4444'}}>Without schema-lens</Heading>
            <ul className={styles.comparisonList}>
              <li>❌ AI agents write slow <code>SELECT</code> queries</li>
              <li>❌ High latency due to network round-trips</li>
              <li>❌ Agents hallucinate column names or relationships</li>
              <li>❌ Exposes raw database access to AI</li>
            </ul>
          </div>
          <div className={clsx(styles.comparisonCard, styles.comparisonCardHighlight)}>
            <Heading as="h3" style={{color: 'hsl(var(--primary))'}}>With schema-lens</Heading>
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
      <div className="container">
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚀</div>
            <Heading as="h3">Offline-Capable</Heading>
            <p>Serves schema answers directly from a local JSON snapshot. No active database connection required during generation.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <Heading as="h3">Millisecond Reads</Heading>
            <p>Because there are no network round-trips to the DB, agents get context back instantly, drastically speeding up coding sessions.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔄</div>
            <Heading as="h3">Auto-Fresh</Heading>
            <p>Fingerprint drift detection automatically warns you or refreshes the cache when your real database schema changes.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Stop guessing your schema. Let your AI agent look it up.">
      <div style={{ overflow: 'hidden' }}>
        <HeroSection />
        <main>
          <SetupSection />
          <ComparisonSection />
          <FeaturesSection />
        </main>
      </div>
    </Layout>
  );
}
