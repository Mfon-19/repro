package store

import (
	"context"
	"crypto/rand"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store interface {
	Health(ctx context.Context) error
	UpsertOAuthUser(ctx context.Context, user OAuthUser) (User, error)
}

type PgxStore struct {
	pool *pgxpool.Pool
}

func NewPgxStore(pool *pgxpool.Pool) *PgxStore {
	return &PgxStore{pool: pool}
}

func (s *PgxStore) Health(ctx context.Context) error {
	if s.pool == nil {
		return nil
	}
	return s.pool.Ping(ctx)
}

func (s *PgxStore) UpsertOAuthUser(ctx context.Context, user OAuthUser) (User, error) {
	_ = ctx
	// TODO: Persist users in the database (users table keyed by provider + provider_user_id).
	// TODO: Return the existing user on conflict and update profile fields.
	return newUserFromOAuth(user), nil
}

type NoopStore struct{}

func NewNoopStore() *NoopStore {
	return &NoopStore{}
}

func (s *NoopStore) Health(ctx context.Context) error {
	return nil
}

func (s *NoopStore) UpsertOAuthUser(ctx context.Context, user OAuthUser) (User, error) {
	_ = ctx
	return newUserFromOAuth(user), nil
}

type OAuthUser struct {
	Provider       string
	ProviderUserID string
	Name           string
	Email          string
	Nickname       string
	AvatarURL      string
}

type User struct {
	ID             string
	Provider       string
	ProviderUserID string
	Name           string
	Email          string
	Nickname       string
	AvatarURL      string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func newUserFromOAuth(oauth OAuthUser) User {
	now := time.Now().UTC()
	return User{
		ID:             userIDFromOAuth(oauth),
		Provider:       oauth.Provider,
		ProviderUserID: oauth.ProviderUserID,
		Name:           oauth.Name,
		Email:          oauth.Email,
		Nickname:       oauth.Nickname,
		AvatarURL:      oauth.AvatarURL,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

func userIDFromOAuth(oauth OAuthUser) string {
	if oauth.Provider != "" && oauth.ProviderUserID != "" {
		return fmt.Sprintf("%s:%s", oauth.Provider, oauth.ProviderUserID)
	}
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "user_unknown"
	}
	return fmt.Sprintf("user_%x", buf)
}
