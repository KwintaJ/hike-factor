package repository

import (
    "context"
    "log"
    "os"

    "github.com/jackc/pgx/v5/pgxpool"
)

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

    // sprawdzenie czy tabela trails jest pusta
    ctx := context.Background()
    count := -1
    _ = pool.QueryRow(ctx, "SELECT COUNT(*) FROM trails").Scan(&count)
    if count <= 0 { 
        SeedTrailData(pool)
    }

    return pool
}

