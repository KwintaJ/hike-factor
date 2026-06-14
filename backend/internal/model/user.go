package model

import "time"

type User struct {
    ID           int       `json:"id"`
    Username     string    `json:"username"`
    PasswordHash string    `json:"-"`
    CreatedAt    time.Time `json:"created_at"`
}

type FavoriteTrail struct {
    UserID    int       `json:"user_id"`
    TrailID   int       `json:"trail_id"`
    CreatedAt time.Time `json:"created_at"`
}

type Credentials struct {
    Username string `json:"username"`
    Password string `json:"password"`
}