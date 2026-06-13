package handler

import (
    "encoding/json"
    "fmt"
    "math"
    "net/http"
    "context"

    "hike-factor/internal/avalanche"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/labstack/echo/v4"
    _ "github.com/lib/pq"
)

type Handler struct {
    DB *pgxpool.Pool
}

type OpenMeteoResponse struct {
    Hourly struct {
        WeatherCode     []int       `json:"weather_code"`
        Temperature2m   []float64   `json:"temperature_2m"`
        WindSpeed10m    []float64   `json:"wind_speed_10m"`
        Rain            []float64   `json:"rain"`
        Snowfall        []float64   `json:"snowfall"`
        SnowDepth       []float64   `json:"snow_depth"`
    } `json:"hourly"`
}

type TrailConditionsResponse struct {
    TrailName           string          `json:"trail_name"`
    HikeFactor          int             `json:"hikeFactor"`
    Weather             WeatherInfo     `json:"weather"`
    Precipitation24h    PrecipInfo      `json:"precipitation24h"`
    Surface             SurfaceInfo     `json:"surface"`
    Avalanche           AlavancheInfo   `json:"avalanche"`
    Elevation           ElevationInfo   `json:"elevation"`
    Distance            float64         `json:"distance"`
    Slope               string          `json:"slope"`
}

type WeatherInfo struct {
    Condition   string  `json:"condition"`
    TempMin     float64 `json:"temp_min"`
    TempMax     float64 `json:"temp_max"`
    Wind        float64 `json:"wind"`
}

type PrecipInfo struct {
    Level   float64     `json:"level"`
    Type    string      `json:"type"`
}

type SurfaceInfo struct {
    Status      string  `json:"status"`
    Description string  `json:"description"`
}

type AlavancheInfo struct {
    Level       int     `json:"level"`
    Description string  `json:"description"`
}

type ElevationInfo struct {
    Min int `json:"min"`
    Max int `json:"max"`
}

func (h *Handler) getTrailData(id string) (string, string, string, int, int, float64, error) {
    var lat, lon, dist float64
    var minElev, maxElev int
    var trailName string

    query := `
        SELECT 
            ST_Y(ST_Centroid(geom)), 
            ST_X(ST_Centroid(geom)),
            min_elevation,
            max_elevation,
            distance,
            name
        FROM trails 
        WHERE id = $1 
        LIMIT 1`

    err := h.DB.QueryRow(context.Background(), query, id).Scan(&lat, &lon, &minElev, &maxElev, &dist, &trailName)
    if err != nil {
        return "", "", "", 0, 0, 0.0, err
    }

    return trailName, fmt.Sprintf("%.6f", lat), fmt.Sprintf("%.6f", lon), minElev, maxElev, dist, nil
}

func evaluateConditions(trailName string, meteo OpenMeteoResponse, avLevel int, minE int, maxE int, dist float64) TrailConditionsResponse {
    forecastStartIdx := 72 
    hikeFactorScore := 10

    // warunki
    SunnyConditionsFreq := 0
    OvercastConditionsFreq := 0
    RainConditionsFreq := 0
    SnowConditionsFreq := 0
    StormConditionsFreq := 0
    for i := 0; i < 24 && (forecastStartIdx + i) < len(meteo.Hourly.WeatherCode); i++ {
        iCond := meteo.Hourly.WeatherCode[forecastStartIdx + i]
        switch {
            case iCond == 0:
                SunnyConditionsFreq += 1
            case iCond <= 3:
                OvercastConditionsFreq += 1
            case iCond >= 51 && iCond <= 67:
                RainConditionsFreq += 1
            case iCond >= 71 && iCond <= 77:
                SnowConditionsFreq += 1
            case iCond >= 95:
                StormConditionsFreq += 1
        }
    }

    weatherConditions := "Zmienne warunki"

    if StormConditionsFreq > 0 {
        hikeFactorScore -= 3
        if RainConditionsFreq > 0 {
            weatherConditions = "Możliwe burze i opady"
        } else {
            weatherConditions = "Uwaga: Możliwe burze"
        }
    } else if SnowConditionsFreq > 0 {
        hikeFactorScore -= 1
        if SnowConditionsFreq > 12 {
            weatherConditions = "Ciągłe opady śniegu"
        } else if SunnyConditionsFreq >= 4 {
            weatherConditions = "Słonecznie, przelotne opady śniegu"
        } else {
            weatherConditions = "Pochmurno, przelotne opady śniegu"
        }
    } else if RainConditionsFreq > 0 {
        hikeFactorScore -= 1
        if RainConditionsFreq > 12 {
            hikeFactorScore -= 1
            weatherConditions = "Deszczowo przez większość dnia"
        } else if SunnyConditionsFreq >= 5 {
            weatherConditions = "Słonecznie, przelotne opady deszczu"
        } else {
            weatherConditions = "Pochmurno z przelotnymi opadami"
        }
    } else {
        if SunnyConditionsFreq >= 20 {
            weatherConditions = "Słonecznie cały dzień"
        } else if OvercastConditionsFreq >= 20 {
            weatherConditions = "Całkowite zachmurzenie"
        } else if SunnyConditionsFreq > OvercastConditionsFreq {
            weatherConditions = "Przeważnie słonecznie"
        } else {
            weatherConditions = "Zachmurzenie z przejaśnieniami"
        }
    }

    // temperatura
    tempMax := -200.0
    tempMin := 200.0
    for i := 0; i < 24 && (forecastStartIdx + i) < len(meteo.Hourly.Temperature2m); i++ {
        iTemp := meteo.Hourly.Temperature2m[forecastStartIdx + i]
        if tempMax < iTemp { tempMax = iTemp }
        if tempMin > iTemp { tempMin = iTemp }
    }

    if tempMin < 4   { hikeFactorScore -= 1 }
    if tempMin < -12 { hikeFactorScore -= 1 }
    if tempMax > 25  { hikeFactorScore -= 1 }
    if tempMax > 32  { hikeFactorScore -= 1 }

    // wiatr
    windMax := 0.0
    for i := 0; i < 24 && (forecastStartIdx + i) < len(meteo.Hourly.WindSpeed10m); i++ {
        iWind := meteo.Hourly.WindSpeed10m[forecastStartIdx + i]
        if windMax < iWind { windMax = iWind }
    }

    if windMax > 35 { hikeFactorScore -= 1 }
    if windMax > 60 { hikeFactorScore -= 2 }

    // opady
    rain24h := 0.0
    for i := 0; i < 24 && (forecastStartIdx + i) < len(meteo.Hourly.Rain); i++ {
        rain24h += meteo.Hourly.Rain[forecastStartIdx + i]
    }

    snow24h := 0.0
    for i := 0; i < 24 && (forecastStartIdx + i) < len(meteo.Hourly.Snowfall); i++ {
        snow24h += meteo.Hourly.Snowfall[forecastStartIdx + i]
    }

    precip24h := rain24h + snow24h

    precipType := ""
    if rain24h > 0 && snow24h > 0 {
        precipType = "deszczu ze śniegiem"
    } else if rain24h > 0 {
        precipType = "deszczu"
    } else if snow24h > 0 {
        precipType = "śniegu"
    }


    // powierzchnia
    pastPrecip := 0.0
    lastRainTime := -1
    lastSnowTime := -1
    for i := 0; i < forecastStartIdx && i < len(meteo.Hourly.Rain); i++ {
        iRain := meteo.Hourly.Rain[i]
        pastPrecip += iRain
        if(iRain > 0) { lastRainTime = i }
    }
    for i := 0; i < forecastStartIdx && i < len(meteo.Hourly.Snowfall); i++ {
        iSnow := meteo.Hourly.Snowfall[i]
        pastPrecip += iSnow
        if(iSnow > 0) { lastSnowTime = i }
    }

    currentSnow := 0
    if len(meteo.Hourly.SnowDepth) > forecastStartIdx {
        currentSnow = int(math.Round(meteo.Hourly.SnowDepth[forecastStartIdx] * 100))
    }

    surfaceStatus := "Sucho"
    if currentSnow > 5 {
        hikeFactorScore -= 1
        surfaceStatus = "Śnieg"
    } else if pastPrecip > 2.0 || precip24h > 1.0 {
        hikeFactorScore -= 1
        surfaceStatus = "Ślisko"
    }

    surfDescription := "Nie padało od 3 dni"
    if lastRainTime != -1 {
        surfDescription = fmt.Sprintf("Deszcz %d godzin temu", 72 - lastRainTime)
    } else if lastRainTime == forecastStartIdx {
        surfDescription = "Pada deszcz"
    } else if lastSnowTime != -1 {
        surfDescription = fmt.Sprintf("Śnieg %d godzin temu", 72 - lastSnowTime)
    } else if lastSnowTime == forecastStartIdx {
        surfDescription = "Pada śnieg"
    }


    // zagrożenie lawinowe
    avDescription := "Zagrożenie lawinowe nieznane"

    switch avLevel {
        case 0:
            avDescription = "Brak zagrożenia lawinowego"
        case 1:
            avDescription = "Niski stopień zagrożenia"
            hikeFactorScore -= 1
        case 2:
            avDescription = "Umiarkowane zagrożenie lawinowe"
            hikeFactorScore -= 2
        case 3:
            avDescription = "Znaczne zagrożenie lawinowe - wymaga doświadczenia taternickiego"
            hikeFactorScore -= 4
        case 4:
            avDescription = "Wysokie zagrożenie lawinowe - wymaga eksperckiej wiedzy lawinoznawczej"
            hikeFactorScore -= 6
        case 5:
            avDescription = "Bardzo wysokie zagrożenie lawinowe - zostań w domu"
            hikeFactorScore = -1000
    }


    // profil trasy
    slope := "Płasko"
    
    if dist > 0 {
        elevationDiff := float64(maxE - minE)
        gainPerKm := elevationDiff / dist
        switch {
            case gainPerKm >= 50 && gainPerKm < 140:
                slope = "Lekkie nachylenie"
            case gainPerKm >= 140 && gainPerKm < 275:
                hikeFactorScore -= 1
                slope = "Stromo"
            case gainPerKm >= 275:
                hikeFactorScore -= 2
                slope = "Bardzo stromo"
        }
    }

    // hike factor reset to 1
    if hikeFactorScore < 1 {
        hikeFactorScore = 1
    }

    // return conditions
    return TrailConditionsResponse{
        TrailName:          trailName,
        HikeFactor:         hikeFactorScore,
        Weather: WeatherInfo{
            Condition:      weatherConditions,
            TempMin:        tempMin,
            TempMax:        tempMax,
            Wind:           windMax,
        },
        Precipitation24h: PrecipInfo{
            Level:          math.Round(precip24h*10) / 10,
            Type:           precipType,
        },
        Surface: SurfaceInfo{
            Status:         surfaceStatus,
            Description:    surfDescription,
        },
        Avalanche: AlavancheInfo{
            Level:          avLevel, 
            Description:    avDescription,
        },
        Elevation: ElevationInfo{
            Min:    minE,
            Max:    maxE,
        }, 
        Distance:   dist,
        Slope:      slope,
    }
}

func (h *Handler) GetTrailConditionsHandler(c echo.Context) error {
    id := c.QueryParam("id")
    if id == "" {
        return c.JSON(http.StatusBadRequest, map[string]string{"error": "Missing id parameter"})
    }

    trailName, lat, lon, minElev, maxElev, dist, err := h.getTrailData(id)
    if err != nil {
        fmt.Printf("DEBUG: Błąd pobierania danych dla ID %s: %v\n", id, err)
        return c.JSON(http.StatusNotFound, map[string]string{"error": "Trail not found or DB error"})
    }

    apiURL := fmt.Sprintf(
        "https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&hourly=weather_code,temperature_2m,wind_speed_10m,rain,snowfall,snow_depth&past_days=3&forecast_days=1",
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

    avLevel := avalanche.GetAvalancheLevel()

    report := evaluateConditions(trailName, meteoData, avLevel, minElev, maxElev, dist)
    return c.JSON(http.StatusOK, report)
}