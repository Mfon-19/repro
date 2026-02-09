import { Sandbox } from '@vercel/sandbox';

import { sql } from './db';
import { generateId } from './id';

export type SnapshotRow = {
  id: string;
  language: string;
  runtime: string;
  snapshot_id: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

type SandboxProfile = {
  language: string;
  runtime: 'node24' | 'node22' | 'python3.13';
  needsBootstrap: boolean;
  installCommands?: { cmd: string; args?: string[]; sudo?: boolean }[];
};

const PROFILES: Record<string, SandboxProfile> = {
  typescript: {
    language: 'typescript',
    runtime: 'node22',
    needsBootstrap: false,
  },
  node: {
    language: 'node',
    runtime: 'node22',
    needsBootstrap: false,
  },
  go: {
    language: 'go',
    runtime: 'node22',
    needsBootstrap: true,
    installCommands: [
      { cmd: 'dnf', args: ['install', '-y', 'golang'], sudo: true },
      { cmd: 'go', args: ['version'] },
    ],
  },
};

export function resolveProfile(language: string): SandboxProfile {
  return PROFILES[language] || PROFILES.typescript;
}

async function fetchSnapshot(language: string) {
  const result = await sql<SnapshotRow>`
    select * from sandbox_snapshots where language = ${language} limit 1
  `;
  return result.rows[0] || null;
}

async function upsertSnapshot(input: {
  language: string;
  runtime: string;
  snapshotId: string;
  expiresAt: Date;
}) {
  const id = generateId('snapshot');
  await sql`
    insert into sandbox_snapshots (id, language, runtime, snapshot_id, expires_at)
    values (${id}, ${input.language}, ${input.runtime}, ${input.snapshotId}, ${input.expiresAt.toISOString()})
    on conflict (language)
    do update set
      runtime = excluded.runtime,
      snapshot_id = excluded.snapshot_id,
      expires_at = excluded.expires_at,
      updated_at = now()
  `;
}

export async function ensureSnapshot(language: string) {
  const profile = resolveProfile(language);
  if (!profile.needsBootstrap) {
    return { profile, snapshotId: null };
  }

  const existing = await fetchSnapshot(profile.language);
  if (existing) {
    const expiresAt = new Date(existing.expires_at);
    if (expiresAt.getTime() > Date.now()) {
      return { profile, snapshotId: existing.snapshot_id };
    }
  }

  const sandbox = await Sandbox.create({
    runtime: profile.runtime,
    timeout: 10 * 60 * 1000,
  });

  try {
    for (const command of profile.installCommands || []) {
      await sandbox.runCommand({
        cmd: command.cmd,
        args: command.args,
        sudo: command.sudo,
      });
    }
  } finally {
    // snapshot() will stop the sandbox; stop explicitly only on errors
  }

  const snapshot = await sandbox.snapshot();
  await upsertSnapshot({
    language: profile.language,
    runtime: profile.runtime,
    snapshotId: snapshot.snapshotId,
    expiresAt: snapshot.expiresAt,
  });

  return { profile, snapshotId: snapshot.snapshotId };
}

export async function createExecutionSandbox(language: string) {
  const { profile, snapshotId } = await ensureSnapshot(language);
  if (snapshotId) {
    return Sandbox.create({
      source: { type: 'snapshot', snapshotId },
      timeout: 10 * 60 * 1000,
    });
  }
  return Sandbox.create({
    runtime: profile.runtime,
    timeout: 10 * 60 * 1000,
  });
}
