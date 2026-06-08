package main

import (
	"context"
	"net/http"
	"strconv"

	"hike-factor/internal/handler"
	"hike-factor/internal/model"
	"hike-factor/internal/repository"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()

	dbPool := repository.InitDB()
	defer dbPool.Close()
	repository.SeedData(dbPool)

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:5173"},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	e.Validator = &handler.CustomValidator{Validator: validator.New()}

	// GET /api/trails
	e.GET("/api/trails", func(c echo.Context) error {
		query := `
			SELECT json_build_object(
				'type', 'FeatureCollection',
				'features', json_agg(
					json_build_object(
						'type', 'Feature',
						'id', id,
						'geometry', ST_AsGeoJSON(geom)::json,
						'properties', json_build_object(
							'id', id,
							'name', name,
							'color', color,
							'difficulty', difficulty
						)
					)
				)
			) FROM trails;
		`

		var geojsonRaw string
		err := dbPool.QueryRow(context.Background(), query).Scan(&geojsonRaw)
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Błąd odczytu danych przestrzennych")
		}

		return c.Blob(http.StatusOK, echo.MIMEApplicationJSON, []byte(geojsonRaw))
	})

	// GET /api/trails/:id/conditions
	e.GET("/api/trails/:id/conditions", func(c echo.Context) error {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Niepoprawny format ID")
		}

		mockConditions := model.TrailConditions{
			TrailID: id,
			HikeFactor: model.HikeFactor{
				Score:       45 + (id % 50),
				Label:       "Zmienne warunki",
				Description: "Dane pogodowe wyznaczone dynamicznie",
			},
			WeatherForecast: model.WeatherForecast{
				TempCelsius:  12.5,
				WindSpeedKmh: 15,
				Conditions:   "Zachmurzenie umiarkowane",
			},
			AvalancheDangerLevel: 1,
		}
		return c.JSON(http.StatusOK, mockConditions)
	})

	e.Logger.Fatal(e.Start(":8080"))
}