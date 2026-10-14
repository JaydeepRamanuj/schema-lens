-- ============================================================
-- fixtures/schema.sql — the single integration fixture.
-- Shared by integration tests, e2e tests, landing-page sample capture
-- and the benchmark. Load it into an empty database (see test/helpers/db.ts).
-- Must run on PostgreSQL 14+ and on PGlite.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS analytics;

-- ── Types ────────────────────────────────────────────────────

CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'cancelled', 'refunded');

-- Domain with a CHECK (SC-2)
CREATE DOMAIN email_address AS text
  CHECK (VALUE ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Composite type used by a column (SC-2)
CREATE TYPE address_t AS (
  line1       text,
  city        text,
  postal_code text,
  country     char(2)
);

-- ── Core tables ──────────────────────────────────────────────

CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            email_address NOT NULL,
  full_name        text,
  shipping_address address_t,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email)
);
COMMENT ON TABLE users IS 'Registered customers who can place orders';
COMMENT ON COLUMN users.email IS 'Login email, unique per user';

CREATE TABLE orders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status     order_status NOT NULL DEFAULT 'pending',
  total      numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_total_check CHECK (total >= 0)
);
COMMENT ON TABLE orders IS 'Customer orders';
COMMENT ON COLUMN orders.total IS 'Order total in the account currency';

CREATE TABLE order_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  sku        text NOT NULL,
  quantity   integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL
);

-- Multi-column index
CREATE INDEX orders_user_id_created_at_idx ON orders (user_id, created_at);

-- ── RLS, policy, trigger ─────────────────────────────────────

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_owner ON orders
  FOR ALL
  USING (user_id::text = current_setting('app.user_id', true));

CREATE FUNCTION orders_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_touch
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION orders_touch_updated_at();

-- ── View ─────────────────────────────────────────────────────

CREATE VIEW recent_orders AS
  SELECT o.id, o.user_id, o.status, o.total, o.created_at
  FROM orders o
  WHERE o.created_at > now() - interval '30 days';

-- ── Polymorphic and unrelated tables ─────────────────────────

CREATE TABLE comments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commentable_type text NOT NULL,
  commentable_id   uuid NOT NULL,
  author_id        uuid REFERENCES users (id) ON DELETE SET NULL,
  body             text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_commentable_idx ON comments (commentable_type, commentable_id);

-- No foreign keys in or out
CREATE TABLE audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event       text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- ── Index variety (SC-1) ─────────────────────────────────────

CREATE INDEX audit_log_payload_gin_idx ON audit_log USING gin (payload);
CREATE INDEX orders_pending_idx ON orders (created_at) WHERE status = 'pending';
CREATE INDEX users_lower_email_idx ON users (lower(email));
CREATE INDEX order_items_order_id_include_idx ON order_items (order_id) INCLUDE (sku, quantity);

-- ── Partitioned table (SC-3) ─────────────────────────────────

CREATE TABLE events (
  id          bigint NOT NULL,
  occurred_at timestamptz NOT NULL,
  kind        text NOT NULL,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE events_2026 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE events_2027 PARTITION OF events
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- ── Billing (landing page and benchmark scenarios) ───────────

CREATE TABLE customers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid UNIQUE REFERENCES users (id) ON DELETE SET NULL,
  billing_email      email_address NOT NULL,
  billing_address    address_t,
  stripe_customer_id text UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE refunds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers (id),
  amount      numeric(12, 2) NOT NULL CHECK (amount > 0),
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE disputes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers (id),
  refund_id   uuid REFERENCES refunds (id),
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'won', 'lost')),
  opened_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Second schema with a cross-schema FK ─────────────────────

CREATE TABLE analytics.page_views (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id   uuid REFERENCES public.users (id) ON DELETE SET NULL,
  path      text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE analytics.page_views IS 'Raw page view events';
