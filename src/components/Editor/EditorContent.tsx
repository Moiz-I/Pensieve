import { useRemirror, Remirror, ThemeProvider } from '@remirror/react';
import { AllStyledComponent } from '@remirror/styles/emotion';
import { extensions } from './extensions';

interface EditorContentProps {
  content: string;
  setContent: (content: string) => void;
  analyzeText: (text: string) => void;
}

export default function EditorContent({ content, setContent, analyzeText }: EditorContentProps) {
  const { manager, state } = useRemirror({
    extensions: () => extensions,
    content,
    stringHandler: 'html',
  });

  return (
    <ThemeProvider>
      <AllStyledComponent>
        <Remirror
          manager={manager}
          initialContent={state}
          onChange={({ tr }) => {
            if (tr) {
              const newContent = tr.doc.textContent;
              setContent(newContent);
              analyzeText(newContent);
            }
          }}
        >
          <div className="remirror-editor-wrapper">
            <div className="remirror-editor">
              {/* Your editor content will be rendered here */}
            </div>
          </div>
        </Remirror>
      </AllStyledComponent>
    </ThemeProvider>
  );
} 