package model

type Geometry struct {
	Type        string        `json:"type"`
	Coordinates [][]float64   `json:"coordinates"`
}

type Trail struct {
	ID        int      `json:"id"`
	Name      string   `json:"name"`
	Color     string   `json:"color"`
	Difficulty string  `json:"difficulty"`
	Geometry  Geometry `json:"geometry"`
}

type HikeFactor struct {
	Score       int    `json:"score"`
	Label       string `json:"label"`
	Description string `json:"description"`
}

type WeatherForecast struct {
	TempCelsius  float64 `json:"temp_celsius"`
	WindSpeedKmh float64 `json:"wind_speed_kmh"`
	Conditions   string  `json:"conditions"`
}

type TrailConditions struct {
	TrailID             int             `json:"trail_id"`
	HikeFactor          HikeFactor      `json:"hike_factor"`
	WeatherForecast     WeatherForecast `json:"weather_forecast"`
	AvalancheDangerLevel int             `json:"avalanche_danger_level"`
}

type FavoriteRequest struct {
	TrailID int `json:"trail_id" validate:"required,gt=0"`
}