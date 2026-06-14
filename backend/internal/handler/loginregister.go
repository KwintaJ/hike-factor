package handler

import (
	"hike-factor/internal/model"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey = []byte("asdc87va9")

func (h *Handler) Register(c echo.Context) error {
	creds := new(model.Credentials)
	if err := c.Bind(creds); err != nil {
		return err
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(creds.Password), bcrypt.DefaultCost)

	_, err := h.DB.Exec(c.Request().Context(), 
		"INSERT INTO users (username, password_hash) VALUES ($1, $2)", 
		creds.Username, string(hashedPassword))
	
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Użytkownik już istnieje"})
	}

	return c.NoContent(http.StatusCreated)
}

func (h *Handler) Login(c echo.Context) error {
	creds := new(model.Credentials)
	if err := c.Bind(creds); err != nil {
		return err
	}

	var storedHash string
	var userID int
	err := h.DB.QueryRow(c.Request().Context(), 
		"SELECT id, password_hash FROM users WHERE username = $1", 
		creds.Username).Scan(&userID, &storedHash)

	if err != nil || bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(creds.Password)) != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Błędny login lub hasło"})
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &model.Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(expirationTime)},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString(jwtKey)

	return c.JSON(http.StatusOK, map[string]string{"token": tokenString})
}

func (h *Handler) ValidateToken(c echo.Context) error {
    authHeader := c.Request().Header.Get("Authorization")
    if authHeader == "" {
        return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Brak tokena"})
    }

    tokenString := authHeader[7:]
    
    token, err := jwt.ParseWithClaims(tokenString, &model.Claims{}, func(token *jwt.Token) (interface{}, error) {
        return jwtKey, nil
    })

    if err != nil || !token.Valid {
        return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Token nieważny"})
    }

    return c.NoContent(http.StatusOK)
}