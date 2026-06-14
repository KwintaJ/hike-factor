package handler

import (
    "encoding/json"
    "log"
    "net/http"
    "time"
    "context"

    "github.com/labstack/echo/v4"
    "hike-factor/internal/model"
)

type TrailConditionsQuery struct {
    ID int `query:"id" validate:"required,gt=0"`
}

func (h *Handler) GetTrailConditionsProxy(c echo.Context) error {
    req := new(TrailConditionsQuery)

    if err := c.Bind(req); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Nieprawidłowy format parametru ID (musi być liczbą)")
    }

    if err := c.Validate(req); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "Identyfikator szlaku jest wymagany i musi być większy od 0")
    }

    ctx := c.Request().Context()

    var (
        conditions model.TrailConditions
        weatherRaw, precipRaw, surfaceRaw, avalancheRaw, elevationRaw []byte
        updatedAt time.Time
    )
    conditions.TrailID = req.ID

    // sprawdzamy cache w bazie
    dbErr := h.DB.QueryRow(ctx, `
        SELECT trail_name, hike_factor, weather, precipitation_24h, surface, avalanche, elevation, distance, slope, updated_at
        FROM trail_conditions
        WHERE trail_id = $1
    `, req.ID).Scan(
        &conditions.TrailName,
        &conditions.HikeFactor,
        &weatherRaw,
        &precipRaw,
        &surfaceRaw,
        &avalancheRaw,
        &elevationRaw,
        &conditions.Distance,
        &conditions.Slope,
        &updatedAt,
    )

    // HIT
    if dbErr == nil && time.Since(updatedAt) < time.Hour {
        _ = json.Unmarshal(weatherRaw, &conditions.Weather)
        _ = json.Unmarshal(precipRaw, &conditions.Precipitation24h)
        _ = json.Unmarshal(surfaceRaw, &conditions.Surface)
        _ = json.Unmarshal(avalancheRaw, &conditions.Avalanche)
        _ = json.Unmarshal(elevationRaw, &conditions.Elevation)

        c.Response().Header().Set("X-Cache", "HIT")
        return c.JSON(http.StatusOK, conditions)
    }

    // MISS
    fresh, fetchErr := h.GetTrailConditionsHandler(c)
    if fetchErr != nil {
        // fallback
        if dbErr == nil {
            _ = json.Unmarshal(weatherRaw, &conditions.Weather)
            _ = json.Unmarshal(precipRaw, &conditions.Precipitation24h)
            _ = json.Unmarshal(surfaceRaw, &conditions.Surface)
            _ = json.Unmarshal(avalancheRaw, &conditions.Avalanche)
            _ = json.Unmarshal(elevationRaw, &conditions.Elevation)

            c.Response().Header().Set("X-Cache", "STALE-FALLBACK")
            return c.JSON(http.StatusOK, conditions)
        }
        return fetchErr
    }

    wJson, _ := json.Marshal(fresh.Weather)
    pJson, _ := json.Marshal(fresh.Precipitation24h)
    sJson, _ := json.Marshal(fresh.Surface)
    aJson, _ := json.Marshal(fresh.Avalanche)
    eJson, _ := json.Marshal(fresh.Elevation)

    // UPSERT
    _, execErr := h.DB.Exec(context.Background(), `
        INSERT INTO trail_conditions (
            trail_id, trail_name, hike_factor, weather, precipitation_24h, surface, avalanche, elevation, distance, slope, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (trail_id)
        DO UPDATE SET
            trail_name = EXCLUDED.trail_name,
            hike_factor = EXCLUDED.hike_factor,
            weather = EXCLUDED.weather,
            precipitation_24h = EXCLUDED.precipitation_24h,
            surface = EXCLUDED.surface,
            avalanche = EXCLUDED.avalanche,
            elevation = EXCLUDED.elevation,
            distance = EXCLUDED.distance,
            slope = EXCLUDED.slope,
            updated_at = EXCLUDED.updated_at
    `, fresh.TrailID, fresh.TrailName, fresh.HikeFactor, wJson, pJson, sJson, aJson, eJson, fresh.Distance, fresh.Slope, time.Now())

    if execErr != nil {
        log.Printf("[Proxy] Błąd zapisu UPSERT dla szlaku %d: %v", req.ID, execErr)
    }

    c.Response().Header().Set("X-Cache", "MISS")
    return c.JSON(http.StatusOK, fresh)
}