package server

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"repro/internal/store"
)

type Server struct {
	router *chi.Mux
	logger *slog.Logger
	store  store.Store
}

func New(logger *slog.Logger, st store.Store) *Server {
	if logger == nil {
		logger = slog.Default()
	}
	if st == nil {
		st = store.NewNoopStore()
	}

	router := chi.NewRouter()
	srv := &Server{
		router: router,
		logger: logger,
		store:  st,
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

	s.router.Route("/api/v1", func(r chi.Router) {
		r.Post("/papers", s.handlePapersUpload)
		r.Get("/papers/{id}", s.handlePaperStatus)
		r.Get("/challenges/{paper_id}", s.handleChallengeSpec)
		r.Post("/challenges/{paper_id}/template", s.handleChallengeTemplate)
		r.Post("/submissions", s.handleSubmissionUpload)
		r.Get("/ws/console/{submission_id}", s.handleConsoleWS)
	})
}
