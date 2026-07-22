import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Link as LinkIcon, Quote, Code } from 'lucide-react';

/**
 * Lightweight contentEditable-based rich text editor.
 * No external library dependency. Supports bold, italic, underline, headings,
 * lists, links, quotes, code blocks. Emits HTML via onChange.
 */
export const RichTextEditor = ({ value = '', onChange, placeholder = 'Start writing...', testId = 'rich-editor' }) => {
  const editorRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Only set initial content once to preserve caret position
    if (isFirstRender.current && editorRef.current) {
      editorRef.current.innerHTML = value || '';
      isFirstRender.current = false;
    }
  }, [value]);

  const exec = (cmd, arg = null) => {
    document.execCommand(cmd, false, arg);
    editorRef.current?.focus();
    handleInput();
  };

  const handleInput = () => {
    if (onChange) onChange(editorRef.current?.innerHTML || '');
  };

  const promptLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) exec('createLink', url);
  };

  const applyBlock = (tag) => {
    exec('formatBlock', tag);
  };

  const toolbarButtons = [
    { icon: Bold, cmd: 'bold', label: 'Bold' },
    { icon: Italic, cmd: 'italic', label: 'Italic' },
    { icon: Underline, cmd: 'underline', label: 'Underline' },
    { type: 'divider' },
    { icon: Heading1, action: () => applyBlock('h1'), label: 'Heading 1' },
    { icon: Heading2, action: () => applyBlock('h2'), label: 'Heading 2' },
    { icon: Quote, action: () => applyBlock('blockquote'), label: 'Quote' },
    { icon: Code, action: () => applyBlock('pre'), label: 'Code Block' },
    { type: 'divider' },
    { icon: List, cmd: 'insertUnorderedList', label: 'Bullet List' },
    { icon: ListOrdered, cmd: 'insertOrderedList', label: 'Ordered List' },
    { type: 'divider' },
    { icon: LinkIcon, action: promptLink, label: 'Insert Link' },
  ];

  return (
    <div className="rounded-lg border border-input bg-background" data-testid={testId}>
      <div className="flex items-center gap-1 border-b border-border p-2 flex-wrap">
        {toolbarButtons.map((btn, idx) => {
          if (btn.type === 'divider') {
            return <div key={idx} className="mx-1 h-6 w-px bg-border" />;
          }
          const Icon = btn.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (btn.action) btn.action();
                else exec(btn.cmd);
              }}
              className="rounded p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
              title={btn.label}
              data-testid={`rich-editor-${btn.cmd || btn.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="min-h-[200px] px-4 py-3 text-foreground focus:outline-none prose prose-invert max-w-none"
        style={{ minHeight: '200px' }}
        data-testid={`${testId}-content`}
      />
      <style>{`
        [contentEditable=true]:empty:before {
          content: attr(data-placeholder);
          color: rgb(var(--muted-foreground));
          pointer-events: none;
        }
        [contentEditable=true] h1 { font-size: 2rem; font-weight: 700; margin: 0.5em 0; font-family: 'Outfit', sans-serif; }
        [contentEditable=true] h2 { font-size: 1.5rem; font-weight: 600; margin: 0.5em 0; font-family: 'Outfit', sans-serif; }
        [contentEditable=true] blockquote { border-left: 3px solid rgb(var(--primary)); padding-left: 1em; margin: 0.5em 0; color: rgb(var(--muted-foreground)); font-style: italic; }
        [contentEditable=true] pre { background: rgb(var(--surface-elevated)); padding: 1em; border-radius: 0.5rem; font-family: 'JetBrains Mono', monospace; overflow-x: auto; margin: 0.5em 0; }
        [contentEditable=true] ul, [contentEditable=true] ol { padding-left: 1.5em; margin: 0.5em 0; }
        [contentEditable=true] ul { list-style-type: disc; }
        [contentEditable=true] ol { list-style-type: decimal; }
        [contentEditable=true] a { color: rgb(var(--primary)); text-decoration: underline; }
      `}</style>
    </div>
  );
};
