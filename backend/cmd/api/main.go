package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"repro/internal/server"
	"repro/internal/store"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	addr := getEnv("ADDR", ":8080")
	dbURL := os.Getenv("DATABASE_URL")

	var (
		st   store.Store
		pool *pgxpool.Pool
	)

	if dbURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		p, err := pgxpool.New(ctx, dbURL)
		if err != nil {
			logger.Error("failed to connect to database", slog.Any("error", err))
			os.Exit(1)
		}
		pool = p
		st = store.NewPgxStore(pool)
	} else {
		logger.Warn("DATABASE_URL not set; using noop store")
		st = store.NewNoopStore()
	}

	api := server.New(logger, st)

	httpServer := &http.Server{
		Addr:         addr,
		Handler:      api.Handler(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	logger.Info("api server starting", slog.String("addr", addr))

	err := httpServer.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("api server stopped unexpectedly", slog.Any("error", err))
	}

	if pool != nil {
		pool.Close()
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
