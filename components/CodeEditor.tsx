'use client';

import Editor from '@monaco-editor/react';
import type { OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';

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
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const ensureModels = (monaco: Parameters<OnMount>[1], fileList: CodeFile[]) => {
    fileList.forEach((file) => {
      const uri = monaco.Uri.parse(`file:///${file.path}`);
      if (!monaco.editor.getModel(uri)) {
        monaco.editor.createModel(file.value, file.language || 'plaintext', uri);
      }
    });
  };

  const setActiveModel = (monaco: Parameters<OnMount>[1], editor: Parameters<OnMount>[0], path: string) => {
    const uri = monaco.Uri.parse(`file:///${path}`);
    const model = monaco.editor.getModel(uri);
    if (model) {
      editor.setModel(model);
    }
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    ensureModels(monaco, files);
    setActiveModel(monaco, editor, activePath);

    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (!model || !onFileChange) {
        return;
      }
      const path = model.uri.path.replace(/^\//, '');
      onFileChange(path, model.getValue());
    });
  };

  useEffect(() => {
    if (!monacoRef.current) {
      return;
    }
    ensureModels(monacoRef.current, files);
  }, [files]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }
    setActiveModel(monacoRef.current, editorRef.current, activePath);
  }, [activePath]);

  return (
    <div className="border border-[var(--border)] bg-black/70">
      <div className="border-b border-[var(--border)] px-4 py-2 text-xs text-[#666]">
        {activePath || 'main.go'}
      </div>
      <Editor
        height={height}
        defaultLanguage="plaintext"
        defaultValue=""
        theme="vs-dark"
        options={defaultOptions}
        onMount={handleMount}
      />
    </div>
  );
}
