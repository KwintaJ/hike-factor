package main

import (
	"net/http"
	"strconv"

	"hike-factor/internal/handler"
	"hike-factor/internal/model"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:5173"},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	e.Validator = &handler.CustomValidator{Validator: validator.New()}

	e.HTTPErrorHandler = func(err error, c echo.Context) {
		code := http.StatusInternalServerError
		message := "Wystąpił wewnętrzny błąd serwera"

		if he, ok := err.(*echo.HTTPError); ok {
			code = he.Code
			if m, ok := he.Message.(string); ok {
				message = m
			}
		}

		_ = c.JSON(code, map[string]interface{}{
			"error": message,
			"code":  code,
		})
	}

	// MOCK
	
	// GET /api/trails
	e.GET("/api/trails", func(c echo.Context) error {
		mockTrails := []model.Trail{
			{
				ID:         1,
				Name:       "Szlakiem na Giewont",
				Color:      "blue",
				Difficulty: "hard",
				Geometry: model.Geometry{
					Type: "LineString",
					Coordinates: [][]float64{
						{19.93, 49.25},
						{19.93, 49.23},
					},
				},
			},
		}
		return c.JSON(http.StatusOK, mockTrails)
	})

	// GET /api/trails/:id/conditions
	e.GET("/api/trails/:id/conditions", func(c echo.Context) error {
		idStr := c.Param("id")
		id, err := strconv.Atoi(idStr)
		if err != nil || id != 1 {
			return echo.NewHTTPError(http.StatusNotFound, "Nie znaleziono szlaku o podanym ID")
		}

		mockConditions := model.TrailConditions{
			TrailID: id,
			HikeFactor: model.HikeFactor{
				Score:       68,
				Label:       "Moderate",
				Description: "Szlak miejscami śliski z powodu opadów z poprzedniej doby. Zalecane raczki.",
			},
			WeatherForecast: model.WeatherForecast{
				TempCelsius:  12.5,
				WindSpeedKmh: 25,
				Conditions:   "Rainy",
			},
			AvalancheDangerLevel: 2,
		}
		return c.JSON(http.StatusOK, mockConditions)
	})

	// POST /api/favorites
	e.POST("/api/favorites", func(c echo.Context) error {
		req := new(model.FavoriteRequest)
		
		if err := c.Bind(req); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Niepoprawny format danych")
		}
		
		if err := c.Validate(req); err != nil {
			return err
		}

		return c.JSON(http.StatusCreated, map[string]string{"status": "success"})
	})

	// start server
	e.Logger.Fatal(e.Start(":8080"))
}