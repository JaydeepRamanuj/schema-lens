"use client";
import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

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
        output: <div className="text-zinc-400 whitespace-pre-wrap">users, posts, comments, profiles, orders, products</div>
      },
      mcp_json: {
        command: 'call list_tables {}',
        output: <div className="text-amber-400 whitespace-pre-wrap">{`{\n  "tables": [\n    "users",\n    "posts",\n    "comments",\n    "profiles",\n    "orders",\n    "products"\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call list_tables {}',
        output: <div className="text-purple-400 whitespace-pre-wrap">{`### Tables in Database\n- \`users\`\n- \`posts\`\n- \`comments\`\n- \`profiles\`\n- \`orders\`\n- \`products\``}</div>
      }
    }
  },
  describe_table: {
    label: 'Describe Table',
    modes: {
      cli: {
        command: 'dbctx describe users',
        output: <div className="text-zinc-400 whitespace-pre-wrap">{`Table: users\nColumns:\n  id (uuid) PK\n  email (varchar)\n  created_at (timestamp)`}</div>
      },
      mcp_json: {
        command: 'call describe { "table_name": "users" }',
        output: <div className="text-amber-400 whitespace-pre-wrap">{`{\n  "table": "users",\n  "columns": [\n    { "name": "id", "type": "uuid", "is_pk": true },\n    { "name": "email", "type": "varchar", "is_pk": false },\n    { "name": "created_at", "type": "timestamp", "is_pk": false }\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call describe { "table_name": "users" }',
        output: <div className="text-purple-400 whitespace-pre-wrap">{`### Table: \`users\`\n| Column | Type | PK |\n|---|---|---|\n| id | uuid | ✅ |\n| email | varchar | ❌ |\n| created_at | timestamp | ❌ |`}</div>
      }
    }
  },
  find_relations: {
    label: 'Find Relationships',
    modes: {
      cli: {
        command: 'dbctx related posts',
        output: <div className="text-zinc-400 whitespace-pre-wrap">{`Foreign Keys for posts:\n-> users (user_id = id)`}</div>
      },
      mcp_json: {
        command: 'call related { "table_name": "posts" }',
        output: <div className="text-amber-400 whitespace-pre-wrap">{`{\n  "table": "posts",\n  "foreign_keys": [\n    {\n      "column": "user_id",\n      "references_table": "users",\n      "references_column": "id"\n    }\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call related { "table_name": "posts" }',
        output: <div className="text-purple-400 whitespace-pre-wrap">{`### Foreign Keys for \`posts\`\n- \`posts.user_id\` references \`users.id\``}</div>
      }
    }
  },
  get_column_constraints: {
    label: 'Get Column Constraints',
    modes: {
      cli: {
        command: 'dbctx constraints users email',
        output: <div className="text-zinc-400 whitespace-pre-wrap">{`Constraints for users.email:\nNullable: false\nUnique: true\nDefault: null`}</div>
      },
      mcp_json: {
        command: 'call get_column_constraints { "table_name": "users", "column_name": "email" }',
        output: <div className="text-amber-400 whitespace-pre-wrap">{`{\n  "table": "users",\n  "column": "email",\n  "is_nullable": false,\n  "is_unique": true,\n  "default_value": null\n}`}</div>
      },
      mcp_markdown: {
        command: 'call get_column_constraints { "table_name": "users", "column_name": "email" }',
        output: <div className="text-purple-400 whitespace-pre-wrap">{`### Constraints for \`users.email\`\n- **Nullable:** ❌\n- **Unique:** ✅\n- **Default:** None`}</div>
      }
    }
  },
  find_common_columns: {
    label: 'Find Common Columns (Joins)',
    modes: {
      cli: {
        command: 'dbctx find-common users orders',
        output: <div className="text-zinc-400 whitespace-pre-wrap">{`Common links between users and orders:\nDirect FK: orders.user_id -> users.id`}</div>
      },
      mcp_json: {
        command: 'call find_common_columns { "table_a": "users", "table_b": "orders" }',
        output: <div className="text-amber-400 whitespace-pre-wrap">{`{\n  "table_a": "users",\n  "table_b": "orders",\n  "matches": [\n    { "type": "foreign_key", "from": "orders.user_id", "to": "users.id" }\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call find_common_columns { "table_a": "users", "table_b": "orders" }',
        output: <div className="text-purple-400 whitespace-pre-wrap">{`### Joins between \`users\` and \`orders\`\n- Join on \`orders.user_id = users.id\``}</div>
      }
    }
  },
  join_path: {
    label: 'Find Join Path',
    modes: {
      cli: {
        command: 'dbctx join-path users products',
        output: <div className="text-zinc-400 whitespace-pre-wrap">{`Path from users to products:\nusers -> orders (id = user_id)\norders -> order_items (id = order_id)\norder_items -> products (product_id = id)`}</div>
      },
      mcp_json: {
        command: 'call join_path { "source_table": "users", "target_table": "products" }',
        output: <div className="text-amber-400 whitespace-pre-wrap">{`{\n  "path": [\n    "users",\n    "orders",\n    "order_items",\n    "products"\n  ],\n  "joins": [\n    { "from": "users.id", "to": "orders.user_id" },\n    { "from": "orders.id", "to": "order_items.order_id" },\n    { "from": "order_items.product_id", "to": "products.id" }\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call join_path { "source_table": "users", "target_table": "products" }',
        output: <div className="text-purple-400 whitespace-pre-wrap">{`### Join Path: \`users\` ➡️ \`products\`\n1. \`users.id\` = \`orders.user_id\`\n2. \`orders.id\` = \`order_items.order_id\`\n3. \`order_items.product_id\` = \`products.id\``}</div>
      }
    }
  },
  search_schema: {
    label: 'Search Schema',
    modes: {
      cli: {
        command: 'dbctx search "stripe_id"',
        output: <div className="text-zinc-400 whitespace-pre-wrap">{`Found "stripe_id" in:\n- Table: subscriptions (column: stripe_id)\n- Table: users (column: stripe_customer_id)`}</div>
      },
      mcp_json: {
        command: 'call search_schema { "query": "stripe_id" }',
        output: <div className="text-amber-400 whitespace-pre-wrap">{`{\n  "results": [\n    { "table": "subscriptions", "column": "stripe_id" },\n    { "table": "users", "column": "stripe_customer_id" }\n  ]\n}`}</div>
      },
      mcp_markdown: {
        command: 'call search_schema { "query": "stripe_id" }',
        output: <div className="text-purple-400 whitespace-pre-wrap">{`### Search Results for \`stripe_id\`\n- \`subscriptions.stripe_id\`\n- \`users.stripe_customer_id\``}</div>
      }
    }
  }
};

export default function InteractiveTerminal() {
  const [scenario, setScenario] = useState<ScenarioId>('list_tables');
  const [mode, setMode] = useState<Mode>('cli');
  const [displayedCommand, setDisplayedCommand] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const activeData = scenarios[scenario].modes[mode];

  // Auto-play interval
  useEffect(() => {
    if (!isAutoPlaying) return;

    const intervalId = setInterval(() => {
      setScenario((current) => {
        const keys = Object.keys(scenarios) as ScenarioId[];
        const nextIndex = (keys.indexOf(current) + 1) % keys.length;
        return keys[nextIndex];
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isAutoPlaying]);

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
    <section className="py-16 relative z-10">
      <div className="container max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">See It In Action</h2>
        <div className="relative font-mono rounded-xl bg-[#0a0a0f]/60 backdrop-blur-xl border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] before:absolute before:-inset-px before:rounded-xl before:bg-gradient-to-br before:from-white/10 before:to-transparent before:-z-10 before:pointer-events-none my-8 mx-auto max-w-[800px] text-zinc-200">
          <div className="p-4 flex items-center justify-between border-b border-white/5 bg-transparent rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            
            <div className="flex items-center gap-4 font-sans">
              <div className="flex items-center">
                <Select value={scenario} onValueChange={(val) => {
                  setScenario(val as ScenarioId);
                  setIsAutoPlaying(false);
                }}>
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

              <div className="flex items-center">
                <Tabs value={mode} onValueChange={(val) => {
                  setMode(val as Mode);
                  setIsAutoPlaying(false);
                }}>
                  <TabsList>
                    <TabsTrigger value="cli">CLI</TabsTrigger>
                    <TabsTrigger value="mcp_json">MCP JSON</TabsTrigger>
                    <TabsTrigger value="mcp_markdown">MCP MD</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          <div className="p-6 min-h-[280px] flex flex-col text-sm leading-relaxed font-mono">
            <div className="flex items-center gap-2 mb-4 font-medium text-sky-400">
              <span className="text-green-400">{mode === 'cli' ? '$' : '❯'}</span>
              <span>
                {displayedCommand}
                {isTyping && <span className="inline-block w-2 h-4 bg-sky-400 animate-pulse align-middle" />}
              </span>
            </div>
            {!isTyping && displayedCommand === activeData.command && (
              <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                {activeData.output}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
