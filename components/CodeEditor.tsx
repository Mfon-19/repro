'use client';

import Editor from '@monaco-editor/react';
import { useMemo } from 'react';

const defaultOptions = {
  fontSize: 13,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  lineNumbersMinChars: 3,
  smoothScrolling: true,
  renderLineHighlight: 'line' as const,
  cursorBlinking: 'smooth' as const,
  padding: { top: 12, bottom: 12 },
  scrollbar: {
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
};

export type CodeFile = {
  path: string;
  language?: string;
  value: string;
};

type CodeEditorProps = {
  files: CodeFile[];
  activePath: string;
  height?: number;
  onFileChange?: (path: string, value: string) => void;
};

export default function CodeEditor({ files, activePath, height = 520, onFileChange }: CodeEditorProps) {
  const activeFile = useMemo(() => {
    if (!files.length) {
      return null;
    }
    return files.find((file) => file.path === activePath) || files[0];
  }, [activePath, files]);

  return (
    <div className="border border-[var(--border)] bg-black/70">
      <div className="border-b border-[var(--border)] px-4 py-2 text-xs text-[#666]">
        {activeFile?.path || 'main.go'}
      </div>
      <Editor
        height={height}
        path={activeFile?.path}
        language={activeFile?.language || 'plaintext'}
        value={activeFile?.value || ''}
        theme="vs-dark"
        options={defaultOptions}
        onChange={(value) => {
          if (!activeFile || !onFileChange) {
            return;
          }
          onFileChange(activeFile.path, value ?? '');
        }}
      />
    </div>
  );
}
