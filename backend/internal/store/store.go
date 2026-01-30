package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store interface {
	Health(ctx context.Context) error
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

type NoopStore struct{}

func NewNoopStore() *NoopStore {
	return &NoopStore{}
}

func (s *NoopStore) Health(ctx context.Context) error {
	return nil
}
