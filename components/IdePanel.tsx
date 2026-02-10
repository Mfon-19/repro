'use client';

import { useEffect, useMemo, useState } from 'react';
import CodeEditor, { type CodeFile } from '@/components/CodeEditor';

type IdePanelProps = {
  files: CodeFile[];
  height?: number;
  onFilesChange?: (files: CodeFile[]) => void;
};

export default function IdePanel({ files, height = 520, onFilesChange }: IdePanelProps) {
  const defaultPath = useMemo(() => files[0]?.path || 'main.ts', [files]);
  const [activePath, setActivePath] = useState(defaultPath);

  useEffect(() => {
    if (!files.find((file) => file.path === activePath)) {
      setActivePath(defaultPath);
    }
  }, [activePath, defaultPath, files]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {files.map((file) => {
          const isActive = file.path === activePath;
          return (
            <button
              key={file.path}
              className={`border border-[var(--border)] px-3 py-1 cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[var(--foreground)] text-[var(--background)]'
                  : 'bg-black/50 hover:bg-[var(--border)]/40 hover:text-[var(--accent)]'
              }`}
              onClick={() => setActivePath(file.path)}
              type="button"
            >
              {file.path}
            </button>
          );
        })}
      </div>

      <CodeEditor
        files={files}
        activePath={activePath}
        height={height}
        onFileChange={(path, value) => {
          if (!onFilesChange) {
            return;
          }
          const next = files.map((file) =>
            file.path === path ? { ...file, value } : file
          );
          onFilesChange(next);
        }}
      />
    </div>
  );
}
