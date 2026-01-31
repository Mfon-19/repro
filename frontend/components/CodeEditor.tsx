'use client';

import Editor from '@monaco-editor/react';

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

type CodeEditorProps = {
  value: string;
  language?: string;
  path?: string;
  height?: number;
};

export default function CodeEditor({ value, language = 'go', path, height = 520 }: CodeEditorProps) {
  return (
    <div className="border border-[var(--border)] bg-black/70">
      <div className="border-b border-[var(--border)] px-4 py-2 text-xs text-[#666]">
        {path || 'main.go'}
      </div>
      <Editor
        height={height}
        defaultLanguage={language}
        defaultValue={value}
        theme="vs-dark"
        options={defaultOptions}
      />
    </div>
  );
}
