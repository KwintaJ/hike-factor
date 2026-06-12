package repository

import (
    "context"
    "io"
    "log"
    "strings"
    "os"
    "encoding/csv"

    "github.com/jackc/pgx/v5/pgxpool"
)

type OverpassResponse struct {
    Elements []OverpassElement `json:"elements"`
}

type OverpassElement struct {
    Type    string            `json:"type"`
    ID      int64             `json:"id"`
    Members []OverpassMember  `json:"members"`
    Tags    map[string]string `json:"tags"`
}

type OverpassMember struct {
    Type     string          `json:"type"`
    Geometry []OverpassPoint `json:"geometry"`
}

type OverpassPoint struct {
    Lat float64 `json:"lat"`
    Lon float64 `json:"lon"`
}

func InitDB() *pgxpool.Pool {
    connStr := "postgres://hike_master:supersecretpassword@localhost:5433/hike_factor?sslmode=disable"
    
    if envString := os.Getenv("DB_CONN_STR"); envString != "" {
        connStr = envString
    }

    config, err := pgxpool.ParseConfig(connStr)
    if err != nil {
        log.Fatalf("Konfiguracja bazy błąd: %v", err)
    }

    pool, err := pgxpool.NewWithConfig(context.Background(), config)
    if err != nil {
        log.Fatalf("Pula połączeń błąd: %v", err)
    }
    return pool
}

func resolveTrailColor(tags map[string]string) string {
    osmColor := ""
    if c, ok := tags["color"]; ok {
        osmColor = c
    } else if symbol, ok := tags["osmc:symbol"]; ok {
        parts := strings.Split(symbol, ":")
        if len(parts) > 0 {
            osmColor = parts[0]
        }
    }

    switch strings.ToLower(osmColor) {
    case "red":
        return "#DC2626"
    case "blue":
        return "#2563EB"
    case "green":
        return "#16A34A"
    case "yellow":
        return "#EAB308"
    case "black":
        return "#1F2937"
    default:
        return "#7C3AED"
    }
}

func SeedData(pool *pgxpool.Pool) {
    ctx := context.Background()

    _, _ = pool.Exec(ctx, "CREATE EXTENSION IF NOT EXISTS postgis;")
    _, _ = pool.Exec(ctx, `
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
    `)

    file, err := os.Open("data/trails.csv")
    if err != nil { log.Printf("Nie znaleziono pliku CSV: %v", err); return }
    defer file.Close()

    reader := csv.NewReader(file)
    reader.Read()

    for {
        row, err := reader.Read()
        if err == io.EOF { break }
       
        _, err = pool.Exec(ctx, `
            INSERT INTO trails (name, color, difficulty, min_elevation, max_elevation, distance, geom) 
            VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromText($7, 4326))
            ON CONFLICT (id) DO NOTHING;`,
            row[0], row[1], row[2], row[3], row[4], row[5], row[6])
        if err != nil { log.Printf("Błąd wstawiania szlaku %s: %v", row[0], err) }
    }
}