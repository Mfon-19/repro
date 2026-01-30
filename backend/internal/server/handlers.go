package server

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

const maxUploadSize = 50 << 20 // 50MB

const (
	statusQueued     = "queued"
	statusProcessing = "processing"
	statusReady      = "ready"
)

type errorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

type paperUploadResponse struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	Filename  string `json:"filename"`
	Title     string `json:"title,omitempty"`
	Uploaded  string `json:"uploaded_at"`
	Message   string `json:"message"`
	BytesRead int64  `json:"bytes_read"`
}

type paperStatusResponse struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	UpdatedAt string `json:"updated_at"`
	Progress  int    `json:"progress_percent"`
	Message   string `json:"message"`
}

type challengeSpecResponse struct {
	PaperID     string   `json:"paper_id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Steps       []string `json:"steps"`
}

type challengeTemplateRequest struct {
	Language  string `json:"language"`
	Framework string `json:"framework,omitempty"`
	Repo      string `json:"repo,omitempty"`
}

type challengeTemplateResponse struct {
	TemplateID string   `json:"template_id"`
	PaperID    string   `json:"paper_id"`
	Language   string   `json:"language"`
	Status     string   `json:"status"`
	Files      []string `json:"files"`
	Message    string   `json:"message"`
}

type submissionUploadResponse struct {
	SubmissionID string `json:"submission_id"`
	Status       string `json:"status"`
	Filename     string `json:"filename"`
	UploadedAt   string `json:"uploaded_at"`
	BytesRead    int64  `json:"bytes_read"`
	Message      string `json:"message"`
}

type consoleWSResponse struct {
	SubmissionID string `json:"submission_id"`
	Message      string `json:"message"`
}

func (s *Server) handlePapersUpload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "invalid_multipart",
			Message: "failed to parse multipart form",
		})
		return
	}

	file, header, err := r.FormFile("paper")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "missing_paper_file",
			Message: "paper file is required",
		})
		return
	}
	defer file.Close()

	bytesRead, err := io.Copy(io.Discard, file)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{
			Error:   "upload_failed",
			Message: "failed to read uploaded file",
		})
		return
	}

	// TODO: Upload the paper file to object storage (e.g., S3) and persist metadata in the database.
	// TODO: Trigger async pipeline to extract metadata and generate challenge specs.

	paperID, err := generateID("paper")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{
			Error:   "id_generation_failed",
			Message: "could not generate paper id",
		})
		return
	}

	resp := paperUploadResponse{
		ID:        paperID,
		Status:    statusProcessing,
		Filename:  header.Filename,
		Title:     strings.TrimSpace(r.FormValue("title")),
		Uploaded:  time.Now().UTC().Format(time.RFC3339),
		Message:   "paper accepted for processing",
		BytesRead: bytesRead,
	}
	writeJSON(w, http.StatusAccepted, resp)
}

func (s *Server) handlePaperStatus(w http.ResponseWriter, r *http.Request) {
	paperID := chi.URLParam(r, "id")
	if strings.TrimSpace(paperID) == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "missing_id",
			Message: "paper id is required",
		})
		return
	}

	// TODO: Fetch paper processing status from the database.
	resp := paperStatusResponse{
		ID:        paperID,
		Status:    statusProcessing,
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
		Progress:  42,
		Message:   "paper is being processed",
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleChallengeSpec(w http.ResponseWriter, r *http.Request) {
	paperID := chi.URLParam(r, "paper_id")
	if strings.TrimSpace(paperID) == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "missing_paper_id",
			Message: "paper id is required",
		})
		return
	}

	// TODO: Load challenge spec from the database or cached storage.
	resp := challengeSpecResponse{
		PaperID:     paperID,
		Title:       "Consensus log replication",
		Description: "Implement the core mechanics described in the paper with deterministic tests.",
		Tags:        []string{"distributed-systems", "consensus", "log-replication"},
		Steps: []string{
			"Read the paper and extract the invariants.",
			"Implement the log replication algorithm.",
			"Write tests that prove safety under partitions.",
		},
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleChallengeTemplate(w http.ResponseWriter, r *http.Request) {
	paperID := chi.URLParam(r, "paper_id")
	if strings.TrimSpace(paperID) == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "missing_paper_id",
			Message: "paper id is required",
		})
		return
	}

	var req challengeTemplateRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "invalid_json",
			Message: err.Error(),
		})
		return
	}

	if strings.TrimSpace(req.Language) == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "missing_language",
			Message: "language is required",
		})
		return
	}

	// TODO: Call the LLM service to generate language-specific scaffolding.

	templateID, err := generateID("tmpl")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{
			Error:   "id_generation_failed",
			Message: "could not generate template id",
		})
		return
	}

	resp := challengeTemplateResponse{
		TemplateID: templateID,
		PaperID:    paperID,
		Language:   req.Language,
		Status:     statusQueued,
		Files:      []string{"README.md", "src/main." + strings.ToLower(req.Language), "tests/spec_test.go"},
		Message:    "template generation queued",
	}
	writeJSON(w, http.StatusAccepted, resp)
}

func (s *Server) handleSubmissionUpload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "invalid_multipart",
			Message: "failed to parse multipart form",
		})
		return
	}

	file, header, err := r.FormFile("submission")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "missing_submission_file",
			Message: "submission zip file is required",
		})
		return
	}
	defer file.Close()

	if ext := strings.ToLower(filepath.Ext(header.Filename)); ext != ".zip" {
		// TODO: Decide whether to accept other archive formats.
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "invalid_file_type",
			Message: "submission must be a .zip archive",
		})
		return
	}

	bytesRead, err := io.Copy(io.Discard, file)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{
			Error:   "upload_failed",
			Message: "failed to read uploaded file",
		})
		return
	}

	// TODO: Upload submission archive to storage and enqueue evaluation pipeline.

	submissionID, err := generateID("sub")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse{
			Error:   "id_generation_failed",
			Message: "could not generate submission id",
		})
		return
	}

	resp := submissionUploadResponse{
		SubmissionID: submissionID,
		Status:       statusQueued,
		Filename:     header.Filename,
		UploadedAt:   time.Now().UTC().Format(time.RFC3339),
		BytesRead:    bytesRead,
		Message:      "submission accepted for evaluation",
	}
	writeJSON(w, http.StatusAccepted, resp)
}

func (s *Server) handleConsoleWS(w http.ResponseWriter, r *http.Request) {
	submissionID := chi.URLParam(r, "submission_id")
	if strings.TrimSpace(submissionID) == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:   "missing_submission_id",
			Message: "submission id is required",
		})
		return
	}

	if strings.ToLower(r.Header.Get("Upgrade")) != "websocket" {
		writeJSON(w, http.StatusUpgradeRequired, errorResponse{
			Error:   "upgrade_required",
			Message: "websocket upgrade required",
		})
		return
	}

	// TODO: Implement WebSocket upgrades using a dedicated WebSocket library.
	resp := consoleWSResponse{
		SubmissionID: submissionID,
		Message:      "websocket console not implemented yet",
	}
	writeJSON(w, http.StatusNotImplemented, resp)
}

func decodeJSON(r *http.Request, dst any) error {
	if r.Body == nil {
		return errors.New("request body is required")
	}

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		if err == nil {
			return errors.New("unexpected extra JSON values")
		}
		return err
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func generateID(prefix string) (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return fmt.Sprintf("%s_%x", prefix, buf), nil
}
