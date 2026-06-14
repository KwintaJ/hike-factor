package handler

import (
    "net/http"
    "strconv"

    "github.com/golang-jwt/jwt/v5"
    "github.com/labstack/echo/v4"
)

func getUserIDFromToken(c echo.Context) (int, error) {
    userToken := c.Get("user")
    if userToken == nil {
        return 0, echo.NewHTTPError(http.StatusUnauthorized, "Brak tokenu autoryzacyjnego")
    }

    token, ok := userToken.(*jwt.Token)
    if !ok {
        return 0, echo.NewHTTPError(http.StatusUnauthorized, "Nieprawidłowy format tokenu")
    }

    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
        return 0, echo.NewHTTPError(http.StatusUnauthorized, "Nieprawidłowe oświadczenia (claims) tokenu")
    }

    userIDFloat, ok := claims["user_id"].(float64)
    if !ok {
        return 0, echo.NewHTTPError(http.StatusUnauthorized, "Brak identyfikatora użytkownika w tokenie")
    }

    return int(userIDFloat), nil
}

func (h *Handler) GetFavorites(c echo.Context) error {
    userID, err := getUserIDFromToken(c)
    if err != nil {
        return err
    }

    query := `SELECT trail_id FROM favorite_trails WHERE user_id = $1 ORDER BY created_at DESC`
    
    rows, err := h.DB.Query(c.Request().Context(), query, userID)
    if err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Błąd serwera podczas pobierania ulubionych"})
    }
    defer rows.Close()

    type FavoriteResponse struct {
        ID int `json:"id"`
    }

    favorites := []FavoriteResponse{}
    for rows.Next() {
        var trailID int
        if err := rows.Scan(&trailID); err != nil {
            return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Błąd przetwarzania danych"})
        }
        favorites = append(favorites, FavoriteResponse{ID: trailID})
    }

    return c.JSON(http.StatusOK, favorites)
}

func (h *Handler) AddFavorite(c echo.Context) error {
    userID, err := getUserIDFromToken(c)
    if err != nil {
        return err
    }

    trailIDStr := c.QueryParam("id")
    trailID, err := strconv.Atoi(trailIDStr)
    if err != nil || trailID <= 0 {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "Nieprawidłowe lub brakujące ID szlaku"})
    }

    query := `INSERT INTO favorite_trails (user_id, trail_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`
    
    _, err = h.DB.Exec(c.Request().Context(), query, userID, trailID)
    if err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Nie udało się dodać szlaku do ulubionych"})
    }

    return c.JSON(http.StatusCreated, map[string]string{"message": "Szlak dodany do ulubionych"})
}

func (h *Handler) RemoveFavorite(c echo.Context) error {
    userID, err := getUserIDFromToken(c)
    if err != nil {
        return err
    }

    trailIDStr := c.QueryParam("id")
    trailID, err := strconv.Atoi(trailIDStr)
    if err != nil || trailID <= 0 {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "Nieprawidłowe lub brakujące ID szlaku"})
    }

    query := `DELETE FROM favorite_trails WHERE user_id = $1 AND trail_id = $2`
    
    result, err := h.DB.Exec(c.Request().Context(), query, userID, trailID)
    if err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Nie udało się usunąć szlaku z ulubionych"})
    }

    rowsAffected := result.RowsAffected()
    if rowsAffected == 0 {
        return c.JSON(http.StatusNotFound, map[string]string{"message": "Szlak nie znajdował się na liście ulubionych"})
    }

    return c.JSON(http.StatusOK, map[string]string{"message": "Szlak usunięty z ulubionych"})
}