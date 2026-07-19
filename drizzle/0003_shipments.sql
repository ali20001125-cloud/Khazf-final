CREATE TABLE IF NOT EXISTS shipments (
  id serial PRIMARY KEY,
  total_grams integer NOT NULL,
  ship_total integer NOT NULL DEFAULT 0,
  note text,
  received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS shipment_id integer REFERENCES shipments(id);
