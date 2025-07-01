import { lazy, Suspense } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useTextAnalysis } from '@/hooks/useTextAnalysis';

// Lazy load the EditorContent component
const EditorContent = lazy(() => import('./EditorContent'));

export default function Editor() {
  const { content, setContent } = useEditorStore();
  const { analyzeText } = useTextAnalysis();

  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorContent
        content={content}
        setContent={setContent}
        analyzeText={analyzeText}
      />
    </Suspense>
  );
} 