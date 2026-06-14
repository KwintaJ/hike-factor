package repository

import (
    "context"
    "encoding/csv"
    "io"
    "log"
    "os"
    "github.com/jackc/pgx/v5/pgxpool"
)

func SeedTrailData(pool *pgxpool.Pool) {
    ctx := context.Background()

    file, err := os.Open("data/trails.csv")
    if err != nil {
        log.Printf("Nie znaleziono pliku CSV do seedowania danych: %v", err)
        return
    }
    defer file.Close()

    reader := csv.NewReader(file)
    
    if _, err := reader.Read(); err != nil {
        log.Printf("Błąd podczas odczytu nagłówka pliku CSV: %v", err)
        return
    }

    log.Println("Seedowanie tabeli 'trails'...")

    for {
        row, err := reader.Read()
        if err == io.EOF {
            break
        }
        if err != nil {
            log.Printf("Błąd odczytu wiersza z pliku CSV: %v", err)
            continue
        }

        if len(row) < 7 {
            log.Printf("Pominięto niekompletny wiersz danych: %v", row)
            continue
        }

        _, err = pool.Exec(ctx, `
            INSERT INTO trails (name, color, difficulty, min_elevation, max_elevation, distance, geom) 
            VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromText($7, 4326))
            ON CONFLICT (id) DO NOTHING;`,
            row[0], row[1], row[2], row[3], row[4], row[5], row[6],
        )
        
        if err != nil {
            log.Printf("Błąd wstawiania danych dla szlaku %s: %v", row[0], err)
        }
    }

    log.Println("Proces seedowania tabeli 'trails' zakończony pomyślnie.")
}