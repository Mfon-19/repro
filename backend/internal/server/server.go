package server

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"repro/internal/store"
)

const defaultSessionName = "repro-auth"

type Config struct {
	FrontendURL    string
	SessionName    string
	AllowedOrigins []string
}

type Server struct {
	router           *chi.Mux
	logger           *slog.Logger
	store            store.Store
	frontendURL      string
	sessionName      string
	allowedOrigins   map[string]struct{}
	allowAllOrigins  bool
	allowCredentials bool
}

func New(logger *slog.Logger, st store.Store, cfg Config) *Server {
	if logger == nil {
		logger = slog.Default()
	}
	if st == nil {
		st = store.NewNoopStore()
	}

	frontendURL := strings.TrimRight(strings.TrimSpace(cfg.FrontendURL), "/")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	sessionName := strings.TrimSpace(cfg.SessionName)
	if sessionName == "" {
		sessionName = defaultSessionName
	}

	allowedOrigins := normalizeOrigins(cfg.AllowedOrigins)
	if len(allowedOrigins) == 0 {
		allowedOrigins = normalizeOrigins([]string{frontendURL})
	}

	allowAllOrigins := false
	allowCredentials := true
	if _, ok := allowedOrigins["*"]; ok {
		allowAllOrigins = true
		allowCredentials = false
	}

	router := chi.NewRouter()
	srv := &Server{
		router:           router,
		logger:           logger,
		store:            st,
		frontendURL:      frontendURL,
		sessionName:      sessionName,
		allowedOrigins:   allowedOrigins,
		allowAllOrigins:  allowAllOrigins,
		allowCredentials: allowCredentials,
	}

	srv.routes()

	return srv
}

func (s *Server) Handler() http.Handler {
	return s.router
}

func (s *Server) routes() {
	s.router.Use(s.recovererMiddleware())
	s.router.Use(s.loggingMiddleware())
	s.router.Use(s.corsMiddleware())

	s.router.Get("/auth/{provider}", s.handleAuthStart)
	s.router.Get("/auth/{provider}/callback", s.handleAuthCallback)

	s.router.Route("/api/v1", func(r chi.Router) {
		r.Get("/session", s.handleSessionStatus)
		r.Post("/papers", s.handlePapersUpload)
		r.Get("/papers/{id}", s.handlePaperStatus)
		r.Get("/challenges/{paper_id}", s.handleChallengeSpec)
		r.Post("/challenges/{paper_id}/template", s.handleChallengeTemplate)
		r.Post("/submissions", s.handleSubmissionUpload)
		r.Get("/ws/console/{submission_id}", s.handleConsoleWS)
	})
}

func normalizeOrigins(origins []string) map[string]struct{} {
	normalized := make(map[string]struct{})
	for _, origin := range origins {
		trimmed := strings.TrimSpace(origin)
		if trimmed == "" {
			continue
		}
		normalized[strings.TrimRight(trimmed, "/")] = struct{}{}
	}
	return normalized
}
