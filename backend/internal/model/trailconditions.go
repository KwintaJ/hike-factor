package model

type TrailConditions struct {
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