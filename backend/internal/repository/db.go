package repository

import (
    "context"
    "errors"
    "log"
    "os"

    "github.com/jackc/pgx/v5/pgxpool"

    "github.com/golang-migrate/migrate/v4"
    _ "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

var connStr = "postgres://hike_master:supersecretpassword@localhost:5433/hike_factor?sslmode=disable"

func InitDB() *pgxpool.Pool {
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

func MigrateDB() {    
    log.Println("Sprawdzanie i uruchamianie migracji bazy danych...")
    m, err := migrate.New("file://migrations", connStr)
    if err != nil {
        log.Fatalf("Nie można zainicjalizować narzędzia migracji: %v", err)
    }

    // up
    if err := m.Up(); err != nil {
        if !errors.Is(err, migrate.ErrNoChange) {
            log.Fatalf("Krytyczny błąd podczas wykonywania migracji: %v", err)
        }
        log.Println("Baza danych jest aktualna. Brak nowych migracji do wykonania.")
    } else {
        log.Println("Migracje wykonane pomyślnie! Struktura bazy została zaktualizowana.")
    }
}

func SeedData(pool *pgxpool.Pool) {
    // sprawdzenie czy tabela trails jest pusta - jeśli tak seeding
    ctx := context.Background()
    count := -1
    _ = pool.QueryRow(ctx, "SELECT COUNT(*) FROM trails").Scan(&count)
    if count <= 0 { 
        SeedTrailData(pool)
    }
}

