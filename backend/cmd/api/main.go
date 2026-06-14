package main

import (
    "hike-factor/internal/handler"
    "hike-factor/internal/repository"
    "hike-factor/internal/avalanche"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
)

func main() {
    e := echo.New()

    // connection to database
    dbPool := repository.InitDB()
    defer dbPool.Close()

    // migrations
    repository.MigrateDB()

    // seed data
    repository.SeedData(dbPool)

    // start avalanche worker
    avalanche.StartAvalancheWorker()

    // CORS
    e.Use(middleware.Logger())
    e.Use(middleware.Recover())
    e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
        AllowOrigins: []string{"http://localhost:5173"},
        AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
    }))

    // routing
    h := &handler.Handler{DB: dbPool}
    e.GET("/api/trails", h.GetAllTrails)
    e.GET("/api/trails/conditions", h.GetTrailConditionsProxy)

    // logger
    e.Logger.Fatal(e.Start(":8080"))
}