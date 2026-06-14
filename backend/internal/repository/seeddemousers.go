package repository

import (
    "context"
    "log"
	
	"golang.org/x/crypto/bcrypt"

    "github.com/jackc/pgx/v5/pgxpool"
)

func SeedDemoUsers(pool *pgxpool.Pool) {
	ctx := context.Background()

	_, err := pool.Exec(ctx, "DELETE FROM users WHERE username IN ('Test1', 'Test2')")
	if err != nil {
		log.Printf("Błąd podczas czyszczenia użytkowników demo: %v\n", err)
	}

	plainPassword := "Password123!"
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Błąd podczas haszowania hasła demo: %v\n", err)
		return
	}
	hashedPassword := string(hashedBytes)

	var user1ID, user2ID int

	err = pool.QueryRow(ctx, "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id", "Test1", hashedPassword).Scan(&user1ID)
	if err != nil {
		log.Printf("Błąd tworzenia Test1: %v\n", err)
		return
	}

	err = pool.QueryRow(ctx, "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id", "Test2", hashedPassword).Scan(&user2ID)
	if err != nil {
		log.Printf("Błąd tworzenia Test2: %v\n", err)
		return
	}

	favoritesQuery := `INSERT INTO favorite_trails (user_id, trail_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`

	for _, trailID := range []int{12, 92, 103} {
		_, _ = pool.Exec(ctx, favoritesQuery, user1ID, trailID)
	}

	for _, trailID := range []int{33, 71, 72} {
		_, _ = pool.Exec(ctx, favoritesQuery, user2ID, trailID)
	}

	log.Println("Zakończono seedowanie kont demonstracyjnych: Test1 i Test2.")
}