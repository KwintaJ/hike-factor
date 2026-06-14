package model

import "github.com/golang-jwt/jwt/v5"

type Claims struct {
    UserID int `json:"user_id"`
    jwt.RegisteredClaims
}

type AuthResponse struct {
    Token string `json:"token"`
}