package main

import (
    "hike-factor/internal/handler"
    "hike-factor/internal/repository"
    "hike-factor/internal/avalanche"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"

    "github.com/go-playground/validator/v10"

    "github.com/labstack/echo-jwt/v4"
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

    v := validator.New()
    v.RegisterValidation("password", repository.PasswordValidator)
    e.Validator = &repository.CustomValidator{Validator: v}

    // routing
    h := &handler.Handler{DB: dbPool}

    e.GET("/api/trails", h.GetAllTrails)
    e.GET("/api/trails/conditions", h.GetTrailConditionsProxy)

    e.POST("/api/login", h.Login)
    e.POST("/api/register", h.Register)
    e.GET("/api/validate-token", h.ValidateToken)

    r := e.Group("/api")
    r.Use(echojwt.WithConfig(echojwt.Config{
        SigningKey: []byte("asdc87va9"),
    }))

    r.POST("/favorites", h.AddFavorite)
    r.DELETE("/favorites", h.RemoveFavorite)
    r.GET("/favorites", h.GetFavorites)

    // logger
    e.Logger.Fatal(e.Start(":8080"))
}