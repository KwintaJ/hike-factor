CREATE TABLE IF NOT EXISTS trail_conditions (
    id SERIAL PRIMARY KEY,
    trail_id INTEGER NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
    trail_name VARCHAR(255) NOT NULL,
    hike_factor INTEGER NOT NULL DEFAULT 0,
    weather JSONB NOT NULL DEFAULT '{}',
    precipitation_24h JSONB NOT NULL DEFAULT '{}',
    surface JSONB NOT NULL DEFAULT '{}',
    avalanche JSONB NOT NULL DEFAULT '{}',
    elevation JSONB NOT NULL DEFAULT '{}',
    distance DOUBLE PRECISION DEFAULT 0.0,
    slope VARCHAR(50) DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS trail_conditions_trail_id_idx ON trail_conditions(trail_id);