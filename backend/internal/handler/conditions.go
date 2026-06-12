package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	_ "github.com/lib/pq"
)

type Handler struct {
    DB *pgxpool.Pool
}

type OpenMeteoResponse struct {
	Current struct {
		Temperature2m float64 `json:"temperature_2m"`
		WeatherCode   int     `json:"weather_code"`
		WindSpeed10m  float64 `json:"wind_speed_10m"`
	} `json:"current"`
	Hourly struct {
		Precipitation []float64 `json:"precipitation"`
		SnowDepth     []float64 `json:"snow_depth"`
	} `json:"hourly"`
}

type TrailConditionsResponse struct {
	HikeFactor       int           `json:"hikeFactor"`
	Weather          WeatherInfo   `json:"weather"`
	Precipitation24h float64       `json:"precipitation24h"`
	Surface          SurfaceInfo   `json:"surface"`
	AvalancheLevel   int           `json:"avalancheLevel"`
	Elevation        ElevationInfo `json:"elevation"`
}

type WeatherInfo struct {
	Condition string `json:"condition"`
	Temp      int    `json:"temp"`
	Wind      int    `json:"wind"`
}

type SurfaceInfo struct {
	Status    string `json:"status"`
	SnowDepth int    `json:"snowDepth"`
}

type ElevationInfo struct {
	Min int `json:"min"`
	Max int `json:"max"`
}

func (h *Handler) getTrailData(id string) (string, string, int, int, error) {
	var lat, lon float64
	var minElev, maxElev int

	query := `
		SELECT 
			ST_Y(ST_Centroid(geom)), 
			ST_X(ST_Centroid(geom)),
			min_elevation,
			max_elevation
		FROM trails 
		WHERE id = $1 
		LIMIT 1`

	err := h.DB.QueryRow(context.Background(), query, id).Scan(&lat, &lon, &minElev, &maxElev)
	if err != nil {
		return "", "", 0, 0, err
	}

	return fmt.Sprintf("%.6f", lat), fmt.Sprintf("%.6f", lon), minElev, maxElev, nil
}

func interpretWeatherCode(code int) string {
	switch {
	case code == 0:
		return "Słonecznie"
	case code <= 3:
		return "Chmury"
	case code >= 51 && code <= 67:
		return "Deszcz"
	case code >= 71 && code <= 77:
		return "Śnieg"
	case code >= 95:
		return "Burza"
	default:
		return "Zmiennie"
	}
}

func evaluateConditions(meteo OpenMeteoResponse, avalanche int, minE int, maxE int) TrailConditionsResponse {
	forecastStartIdx := 72 
	precip24h := 0.0
	for i := 0; i < 24 && (forecastStartIdx+i) < len(meteo.Hourly.Precipitation); i++ {
		precip24h += meteo.Hourly.Precipitation[forecastStartIdx+i]
	}

	pastPrecip := 0.0
	for i := 0; i < forecastStartIdx && i < len(meteo.Hourly.Precipitation); i++ {
		pastPrecip += meteo.Hourly.Precipitation[i]
	}

	currentSnow := 0
	if len(meteo.Hourly.SnowDepth) > forecastStartIdx {
		currentSnow = int(math.Round(meteo.Hourly.SnowDepth[forecastStartIdx] * 100))
	}

	surfaceStatus := "Sucho"
	if currentSnow > 5 {
		surfaceStatus = "Śnieg"
	} else if pastPrecip > 2.0 || precip24h > 1.0 {
		surfaceStatus = "Ślisko"
	}

	score := 10

	if avalanche == 2 { score -= 2 }
	if avalanche == 3 { score -= 5 }
	if avalanche >= 4 { score -= 10 }

	if meteo.Current.WeatherCode >= 95 {
		score -= 4 
	} else if meteo.Current.WeatherCode >= 71 {
		score -= 3
	} else if meteo.Current.WeatherCode >= 51 {
		score -= 2
	}

	if meteo.Current.Temperature2m < -10 || meteo.Current.Temperature2m > 30 {
		score -= 2
	}
	if meteo.Current.WindSpeed10m > 60 {
		score -= 4
	} else if meteo.Current.WindSpeed10m > 40 {
		score -= 2
	}

	if surfaceStatus == "Ślisko" {
		score -= 2
	} else if surfaceStatus == "Śnieg" {
		score -= 3
	}

	if maxE - minE <= 600 {
		score -= 1
	}

	if score < 1 {
		score = 1
	}

	return TrailConditionsResponse{
		HikeFactor: score,
		Weather: WeatherInfo{
			Condition: interpretWeatherCode(meteo.Current.WeatherCode),
			Temp:      int(math.Round(meteo.Current.Temperature2m)),
			Wind:      int(math.Round(meteo.Current.WindSpeed10m)),
		},
		Precipitation24h: math.Round(precip24h*10) / 10,
		Surface: SurfaceInfo{
			Status:    surfaceStatus,
			SnowDepth: currentSnow,
		},
		AvalancheLevel: avalanche,
		Elevation:      ElevationInfo{Min: minE, Max: maxE}, 
	}
}

func getTrailCoordsById(db *sql.DB, id string) (string, string, error) {
	var lat, lon float64

	query := `
		SELECT ST_Y(ST_Centroid(geom)), ST_X(ST_Centroid(geom)) 
		FROM trails 
		WHERE id = $1 
		LIMIT 1`

	err := db.QueryRow(query, id).Scan(&lat, &lon)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", "", fmt.Errorf("szlak o ID %s nie istnieje", id)
		}
		return "", "", err
	}

	return fmt.Sprintf("%.6f", lat), fmt.Sprintf("%.6f", lon), nil
}

func (h *Handler) GetTrailConditionsHandler(c echo.Context) error {
	id := c.QueryParam("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Missing id parameter"})
	}

	lat, lon, minElev, maxElev, err := h.getTrailData(id)
	if err != nil {
		fmt.Printf("DEBUG: Błąd pobierania danych dla ID %s: %v\n", id, err)
		return c.JSON(http.StatusNotFound, map[string]string{"error": "Trail not found or DB error"})
	}

	fmt.Printf("DEBUG: Pobrano szlak ID %s: Elev %s - %s\n", id, minElev, maxElev)

	apiURL := fmt.Sprintf(
		"https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&current=temperature_2m,weather_code,wind_speed_10m&hourly=precipitation,snow_depth&past_days=3&forecast_days=1",
		lat, lon,
	)

	resp, err := http.Get(apiURL)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to fetch weather"})
	}
	defer resp.Body.Close()

	var meteoData OpenMeteoResponse
	if err := json.NewDecoder(resp.Body).Decode(&meteoData); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Parse error"})
	}

	report := evaluateConditions(meteoData, 1, minElev, maxElev)
	return c.JSON(http.StatusOK, report)
}