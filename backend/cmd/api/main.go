package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/sessions"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/github"

	"repro/internal/server"
	"repro/internal/store"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	addr := getEnv("ADDR", ":8080")
	dbURL := os.Getenv("DATABASE_URL")
	publicURL := strings.TrimRight(getEnv("PUBLIC_URL", "http://localhost:8080"), "/")
	frontendURL := strings.TrimRight(getEnv("FRONTEND_URL", "http://localhost:3000"), "/")
	sessionName := getEnv("SESSION_NAME", "repro-auth")
	sessionSecret := os.Getenv("SESSION_SECRET")
	corsOrigins := splitComma(getEnv("CORS_ORIGINS", frontendURL))

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

	if sessionSecret == "" {
		logger.Warn("SESSION_SECRET not set; using insecure default")
		sessionSecret = "dev-insecure-secret"
	}

	configureGothProviders(logger, publicURL)
	configureSessionStore(sessionSecret, publicURL)

	api := server.New(logger, st, server.Config{
		FrontendURL:    frontendURL,
		SessionName:    sessionName,
		AllowedOrigins: corsOrigins,
	})

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

func splitComma(value string) []string {
	parts := strings.Split(value, ",")
	var results []string
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}
		results = append(results, trimmed)
	}
	return results
}

func configureGothProviders(logger *slog.Logger, publicURL string) {
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	if clientID == "" || clientSecret == "" {
		logger.Warn("GitHub OAuth disabled; set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET")
		return
	}

	callbackURL := getEnv("GITHUB_CALLBACK_URL", publicURL+"/auth/github/callback")
	goth.UseProviders(github.New(clientID, clientSecret, callbackURL, "user:email"))
}

func configureSessionStore(secret, publicURL string) {
	store := sessions.NewCookieStore([]byte(secret))
	store.Options = &sessions.Options{
		Path:     "/",
		HttpOnly: true,
		Secure:   strings.HasPrefix(publicURL, "https://"),
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int((30 * 24 * time.Hour).Seconds()),
	}
	gothic.Store = store
	gothic.GetProviderName = func(r *http.Request) (string, error) {
		if provider := chi.URLParam(r, "provider"); provider != "" {
			return provider, nil
		}
		if provider := r.URL.Query().Get("provider"); provider != "" {
			return provider, nil
		}
		return "", errors.New("oauth provider not specified")
	}
}
