'use client';

import { useEffect, useMemo, useState } from 'react';
import CodeEditor, { type CodeFile } from '@/components/CodeEditor';

type IdePanelProps = {
  files: CodeFile[];
  height?: number;
};

export default function IdePanel({ files, height = 520 }: IdePanelProps) {
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
              className={`border border-[var(--border)] px-3 py-1 ${
                isActive ? 'bg-[var(--foreground)] text-[var(--background)]' : 'bg-black/50'
              }`}
              onClick={() => setActivePath(file.path)}
              type="button"
            >
              {file.path}
            </button>
          );
        })}
      </div>

      <CodeEditor files={files} activePath={activePath} height={height} />
    </div>
  );
}
