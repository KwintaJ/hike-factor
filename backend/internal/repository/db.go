package repository

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "net/url"
    "strings"
    "time"
    "os"

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
            geom GEOMETRY(MultiLineString, 4326) NOT NULL
        );
    `)
    _, _ = pool.Exec(ctx, "TRUNCATE TABLE trails RESTART IDENTITY;")

    overpassURL := "https://overpass.openstreetmap.fr/api/interpreter"    
    rawQuery := `[out:json][timeout:120];
    relation["route"="hiking"](49.18,19.75,49.30,20.15);
    out geom(49.18,19.75,49.30,20.15);`

    data := url.Values{}
    data.Set("data", rawQuery)

    req, err := http.NewRequest("POST", overpassURL, strings.NewReader(data.Encode()))
    if err != nil {
        log.Fatalf("Błąd żądania: %v", err)
    }
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
    req.Header.Set("User-Agent", "HikeFactorAcademic/3.0")

    client := &http.Client{Timeout: 120 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        log.Fatalf("Brak odpowiedzi z API (prawdopodobnie padł serwer OSM): %v", err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if resp.StatusCode != http.StatusOK {
        log.Fatalf("Błąd Overpass API: %s", string(body))
    }

    var osmData OverpassResponse
    if err := json.Unmarshal(body, &osmData); err != nil {
        log.Fatalf("Błąd parsowania JSON: %v", err)
    }

    insertQuery := `
        INSERT INTO trails (name, color, difficulty, geom) 
        VALUES ($1, $2, $3, ST_GeomFromText($4, 4326));
    `

    savedCount := 0
    for _, el := range osmData.Elements {
        name := el.Tags["name"]
        
        if name == "" {
            if ref, ok := el.Tags["ref"]; ok {
                name = "Szlak " + ref
            } else if col, ok := el.Tags["color"]; ok {
                name = "Szlak " + col
            } else {
                name = "Szlak turystyczny TPN"
            }
        }

        var segments []string
        for _, member := range el.Members {
            if member.Type == "way" {
                var pts []string
                for _, pt := range member.Geometry {
                    // ROZWIĄZANIE: Ignorujemy punkty "wycięte" przez Overpass (będące zerami w Go)
                    if pt.Lat == 0.0 && pt.Lon == 0.0 {
                        continue
                    }
                    pts = append(pts, fmt.Sprintf("%f %f", pt.Lon, pt.Lat))
                }
                
                // Dodajemy segment tylko wtedy, gdy po odcięciu zer wciąż mamy linię (min. 2 punkty)
                if len(pts) >= 2 {
                    segments = append(segments, "("+strings.Join(pts, ", ")+")")
                }
            }
        }

        // Jeśli cały szlak znalazł się poza bboxem i został wycięty do zera, pomijamy go
        if len(segments) == 0 {
            continue
        }

        wktMultiLine := "MULTILINESTRING(" + strings.Join(segments, ", ") + ")"
        color := resolveTrailColor(el.Tags)
        
        difficulty := "standard"
        if sac, ok := el.Tags["sac_scale"]; ok {
            difficulty = sac
        }

        _, err := pool.Exec(ctx, insertQuery, name, color, difficulty, wktMultiLine)
        if err != nil {
            log.Printf("Błąd zapisu szlaku %s: %v", name, err)
            continue
        }
        savedCount++
    }

    fmt.Printf("Baza PostGIS została zasilona szlakami (%d)\n", savedCount)
}