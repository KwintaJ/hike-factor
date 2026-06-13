package handler

import (
	"context"
	"net/http"
	"github.com/labstack/echo/v4"
)

func (h *Handler) GetAllTrails(c echo.Context) error {
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
						'difficulty', difficulty,
						'min_elevation', min_elevation,
						'max_elevation', max_elevation
					)
				)
			)
		) FROM trails;
	`

	var geojsonRaw string
	err := h.DB.QueryRow(context.Background(), query).Scan(&geojsonRaw)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Błąd bazy danych")
	}

	return c.Blob(http.StatusOK, echo.MIMEApplicationJSON, []byte(geojsonRaw))
}