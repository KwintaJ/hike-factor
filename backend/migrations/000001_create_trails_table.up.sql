CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS trails (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    min_elevation INTEGER DEFAULT 0,
    max_elevation INTEGER DEFAULT 0,
    distance DOUBLE PRECISION DEFAULT 0.0,
    geom GEOMETRY(MultiLineString, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS trails_geom_idx ON trails USING GIST(geom);