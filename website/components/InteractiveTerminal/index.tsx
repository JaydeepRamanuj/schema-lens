"use client";
import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import styles from './styles.module.css';

type Mode = 'cli' | 'mcp_json' | 'mcp_markdown';
type ScenarioId = 'list_tables' | 'describe_table' | 'find_relations' | 'get_column_constraints' | 'find_common_columns' | 'join_path' | 'search_schema';

interface OutputData {
  command: string;
  output: React.ReactNode;
}

const scenarios: Record<ScenarioId, { label: string; modes: Record<Mode, OutputData> }> = {
  list_tables: {
    label: 'List Tables',
    modes: {
      cli: {
        command: 'dbctx tables',
        output: <div className={styles.outputCli}>users, posts, comments, profiles, orders, products</div>
      },
      mcp_json: {
        command: 'call list_tables {}',
        output: <div className={styles.outputJson}>{`{\n  "tables": [\n    "users",\n    "posts",\n    "comments",\n    "profiles",\n    "orders",\n    "products"\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call list_tables {}',
        output: <div className={styles.outputMarkdown}>{`### Tables in Database\n- \`users\`\n- \`posts\`\n- \`comments\`\n- \`profiles\`\n- \`orders\`\n- \`products\``}</div>
      }
    }
  },
  describe_table: {
    label: 'Describe Table',
    modes: {
      cli: {
        command: 'dbctx describe users',
        output: <div className={styles.outputCli}>{`Table: users\nColumns:\n  id (uuid) PK\n  email (varchar)\n  created_at (timestamp)`}</div>
      },
      mcp_json: {
        command: 'call describe { "table_name": "users" }',
        output: <div className={styles.outputJson}>{`{\n  "table": "users",\n  "columns": [\n    { "name": "id", "type": "uuid", "is_pk": true },\n    { "name": "email", "type": "varchar", "is_pk": false },\n    { "name": "created_at", "type": "timestamp", "is_pk": false }\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call describe { "table_name": "users" }',
        output: <div className={styles.outputMarkdown}>{`### Table: \`users\`\n| Column | Type | PK |\n|---|---|---|\n| id | uuid | ✅ |\n| email | varchar | ❌ |\n| created_at | timestamp | ❌ |`}</div>
      }
    }
  },
  find_relations: {
    label: 'Find Relationships',
    modes: {
      cli: {
        command: 'dbctx related posts',
        output: <div className={styles.outputCli}>{`Foreign Keys for posts:\n-> users (user_id = id)`}</div>
      },
      mcp_json: {
        command: 'call related { "table_name": "posts" }',
        output: <div className={styles.outputJson}>{`{\n  "table": "posts",\n  "foreign_keys": [\n    {\n      "column": "user_id",\n      "references_table": "users",\n      "references_column": "id"\n    }\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call related { "table_name": "posts" }',
        output: <div className={styles.outputMarkdown}>{`### Foreign Keys for \`posts\`\n- \`posts.user_id\` references \`users.id\``}</div>
      }
    }
  },
  get_column_constraints: {
    label: 'Get Column Constraints',
    modes: {
      cli: {
        command: 'dbctx constraints users email',
        output: <div className={styles.outputCli}>{`Constraints for users.email:\nNullable: false\nUnique: true\nDefault: null`}</div>
      },
      mcp_json: {
        command: 'call get_column_constraints { "table_name": "users", "column_name": "email" }',
        output: <div className={styles.outputJson}>{`{\n  "table": "users",\n  "column": "email",\n  "is_nullable": false,\n  "is_unique": true,\n  "default_value": null\n}`}</div>
      },
      mcp_markdown: {
        command: 'call get_column_constraints { "table_name": "users", "column_name": "email" }',
        output: <div className={styles.outputMarkdown}>{`### Constraints for \`users.email\`\n- **Nullable:** ❌\n- **Unique:** ✅\n- **Default:** None`}</div>
      }
    }
  },
  find_common_columns: {
    label: 'Find Common Columns (Joins)',
    modes: {
      cli: {
        command: 'dbctx find-common users orders',
        output: <div className={styles.outputCli}>{`Common links between users and orders:\nDirect FK: orders.user_id -> users.id`}</div>
      },
      mcp_json: {
        command: 'call find_common_columns { "table_a": "users", "table_b": "orders" }',
        output: <div className={styles.outputJson}>{`{\n  "table_a": "users",\n  "table_b": "orders",\n  "matches": [\n    { "type": "foreign_key", "from": "orders.user_id", "to": "users.id" }\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call find_common_columns { "table_a": "users", "table_b": "orders" }',
        output: <div className={styles.outputMarkdown}>{`### Joins between \`users\` and \`orders\`\n- Join on \`orders.user_id = users.id\``}</div>
      }
    }
  },
  join_path: {
    label: 'Find Join Path',
    modes: {
      cli: {
        command: 'dbctx join-path users products',
        output: <div className={styles.outputCli}>{`Path from users to products:\nusers -> orders (id = user_id)\norders -> order_items (id = order_id)\norder_items -> products (product_id = id)`}</div>
      },
      mcp_json: {
        command: 'call join_path { "source_table": "users", "target_table": "products" }',
        output: <div className={styles.outputJson}>{`{\n  "path": [\n    "users",\n    "orders",\n    "order_items",\n    "products"\n  ],\n  "joins": [\n    { "from": "users.id", "to": "orders.user_id" },\n    { "from": "orders.id", "to": "order_items.order_id" },\n    { "from": "order_items.product_id", "to": "products.id" }\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call join_path { "source_table": "users", "target_table": "products" }',
        output: <div className={styles.outputMarkdown}>{`### Join Path: \`users\` ➡️ \`products\`\n1. \`users.id\` = \`orders.user_id\`\n2. \`orders.id\` = \`order_items.order_id\`\n3. \`order_items.product_id\` = \`products.id\``}</div>
      }
    }
  },
  search_schema: {
    label: 'Search Schema',
    modes: {
      cli: {
        command: 'dbctx search "stripe_id"',
        output: <div className={styles.outputCli}>{`Found "stripe_id" in:\n- Table: subscriptions (column: stripe_id)\n- Table: users (column: stripe_customer_id)`}</div>
      },
      mcp_json: {
        command: 'call search_schema { "query": "stripe_id" }',
        output: <div className={styles.outputJson}>{`{\n  "results": [\n    { "table": "subscriptions", "column": "stripe_id" },\n    { "table": "users", "column": "stripe_customer_id" }\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call search_schema { "query": "stripe_id" }',
        output: <div className={styles.outputMarkdown}>{`### Search Results for \`stripe_id\`\n- \`subscriptions.stripe_id\`\n- \`users.stripe_customer_id\``}</div>
      }
    }
  }
};

export default function InteractiveTerminal() {
  const [scenario, setScenario] = useState<ScenarioId>('list_tables');
  const [mode, setMode] = useState<Mode>('cli');
  const [displayedCommand, setDisplayedCommand] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const activeData = scenarios[scenario].modes[mode];

  useEffect(() => {
    setDisplayedCommand('');
    setIsTyping(true);
    let i = 0;
    const fullCommand = activeData.command;
    
    const interval = setInterval(() => {
      setDisplayedCommand(fullCommand.slice(0, i + 1));
      i++;
      if (i >= fullCommand.length) {
        clearInterval(interval);
        setTimeout(() => setIsTyping(false), 200);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [scenario, mode, activeData.command]);

  return (
    <section className={styles.section}>
      <div className="container max-w-6xl mx-auto px-4">
        <h2 className={clsx(styles.sectionTitle, "text-3xl font-bold")}>See It In Action</h2>
        <div className={styles.terminalContainer}>
          <div className={styles.terminalHeader}>
            <div className={styles.windowControls}>
              <div className={styles.dot} style={{ backgroundColor: '#ff5f56' }} />
              <div className={styles.dot} style={{ backgroundColor: '#ffbd2e' }} />
              <div className={styles.dot} style={{ backgroundColor: '#27c93f' }} />
            </div>
            
            <div className={styles.controlsBar}>
              <div className={styles.selectWrapper}>
                <Select value={scenario} onValueChange={(val) => setScenario(val as ScenarioId)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(scenarios) as [ScenarioId, { label: string }][]).map(([key, data]) => (
                      <SelectItem key={key} value={key}>
                        {data.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={styles.tabsWrapper}>
                <Tabs value={mode} onValueChange={(val) => setMode(val as Mode)}>
                  <TabsList>
                    <TabsTrigger value="cli">CLI</TabsTrigger>
                    <TabsTrigger value="mcp_json">MCP JSON</TabsTrigger>
                    <TabsTrigger value="mcp_markdown">MCP MD</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          <div className={styles.terminalBody}>
            <div className={styles.commandLine}>
              <span className={styles.prompt}>{mode === 'cli' ? '$' : '❯'}</span>
              <span>
                {displayedCommand}
                {isTyping && <span className={styles.cursor} />}
              </span>
            </div>
            {!isTyping && displayedCommand === activeData.command && (
              <div className={styles.outputArea}>
                {activeData.output}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
