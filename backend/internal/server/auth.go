package server

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/sessions"
	"github.com/markbates/goth/gothic"

	"repro/internal/store"
)

type sessionStatusResponse struct {
	Authenticated bool               `json:"authenticated"`
	User          *sessionUserResult `json:"user,omitempty"`
}

type sessionUserResult struct {
	ID       string `json:"id"`
	Name     string `json:"name,omitempty"`
	Email    string `json:"email,omitempty"`
	Provider string `json:"provider,omitempty"`
}

func (s *Server) handleAuthStart(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	if strings.TrimSpace(provider) == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "missing_provider",
			Message: "oauth provider is required",
		})
		return
	}

	redirectPath := sanitizeRedirectPath(r.URL.Query().Get("redirect"))
	session, err := s.getAuthSession(r)
	if err == nil {
		session.Values["redirect_path"] = redirectPath
		if saveErr := session.Save(r, w); saveErr != nil {
			s.logger.Warn("failed to persist redirect path", "error", saveErr)
		}
	} else {
		s.logger.Warn("failed to load auth session", "error", err)
	}

	gothic.BeginAuthHandler(w, r)
}

func (s *Server) handleAuthCallback(w http.ResponseWriter, r *http.Request) {
	gothUser, err := gothic.CompleteUserAuth(w, r)
	if err != nil {
		s.logger.Warn("oauth callback failed", "error", err)
		s.redirectToFrontend(w, r, defaultRedirectPath)
		return
	}

	oauthUser := store.OAuthUser{
		Provider:       gothUser.Provider,
		ProviderUserID: gothUser.UserID,
		Name:           firstNonEmpty(gothUser.Name, gothUser.NickName),
		Email:          gothUser.Email,
		Nickname:       gothUser.NickName,
		AvatarURL:      gothUser.AvatarURL,
	}

	user, err := s.store.UpsertOAuthUser(r.Context(), oauthUser)
	if err != nil {
		s.logger.Error("failed to upsert oauth user", "error", err)
		s.redirectToFrontend(w, r, defaultRedirectPath)
		return
	}

	session, sessErr := s.getAuthSession(r)
	if sessErr == nil {
		session.Values["user_id"] = user.ID
		session.Values["provider"] = user.Provider
		session.Values["name"] = user.Name
		session.Values["email"] = user.Email
		redirectPath := defaultRedirectPath
		if storedPath, ok := session.Values["redirect_path"].(string); ok {
			redirectPath = sanitizeRedirectPath(storedPath)
		}
		delete(session.Values, "redirect_path")
		if saveErr := session.Save(r, w); saveErr != nil {
			s.logger.Warn("failed to persist auth session", "error", saveErr)
		}
		s.redirectToFrontend(w, r, redirectPath)
		return
	}

	s.logger.Warn("failed to load auth session", "error", sessErr)
	s.redirectToFrontend(w, r, defaultRedirectPath)
}

func (s *Server) handleSessionStatus(w http.ResponseWriter, r *http.Request) {
	session, err := s.getAuthSession(r)
	if err != nil {
		writeJSON(w, http.StatusOK, sessionStatusResponse{Authenticated: false})
		return
	}

	userID, _ := session.Values["user_id"].(string)
	if strings.TrimSpace(userID) == "" {
		writeJSON(w, http.StatusOK, sessionStatusResponse{Authenticated: false})
		return
	}

	resp := sessionStatusResponse{
		Authenticated: true,
		User: &sessionUserResult{
			ID:       userID,
			Name:     getSessionValue(session, "name"),
			Email:    getSessionValue(session, "email"),
			Provider: getSessionValue(session, "provider"),
		},
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) getAuthSession(r *http.Request) (*sessions.Session, error) {
	return gothic.Store.Get(r, s.sessionName)
}

func (s *Server) redirectToFrontend(w http.ResponseWriter, r *http.Request, path string) {
	redirectPath := sanitizeRedirectPath(path)
	if s.frontendURL == "" {
		http.Redirect(w, r, redirectPath, http.StatusFound)
		return
	}
	url := s.frontendURL + redirectPath
	http.Redirect(w, r, url, http.StatusFound)
}

const defaultRedirectPath = "/home"

func sanitizeRedirectPath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return defaultRedirectPath
	}
	if !strings.HasPrefix(trimmed, "/") || strings.HasPrefix(trimmed, "//") {
		return defaultRedirectPath
	}
	return trimmed
}

func getSessionValue(session *sessions.Session, key string) string {
	if session == nil {
		return ""
	}
	value, _ := session.Values[key].(string)
	return value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
