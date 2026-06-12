package model

type Geometry struct {
	Type        string      `json:"type"`
	Coordinates [][]float64 `json:"coordinates"`
}

type Trail struct {
	ID            int      `json:"id"`
	Name          string   `json:"name"`
	Color         string   `json:"color"`
	Difficulty    string   `json:"difficulty"`
	MinElevation  int      `json:"min_elevation"`
	MaxElevation  int      `json:"max_elevation"`
	Distance	  float64  `json:"distance"`
	Geometry      Geometry `json:"geometry"`
}