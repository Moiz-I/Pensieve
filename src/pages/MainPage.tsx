import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { RemirrorJSON } from "remirror";
import { SessionManager } from "../utils/sessionManager";
import Editor from "../components/Editor";
import { performAnalysis } from "../utils/analysisUtils";
import { MAIN_SESSION_ID, ensureMainSession } from "../utils/migrationUtils";

// Empty Remirror document
const EMPTY_DOCUMENT: RemirrorJSON = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: []
    }
  ]
};

// Sample text content
const sampleContent = {
  topic: "Oranges Are the Best Fruit",
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          // Claim
          { type: "text", text: "Oranges are clearly the best fruit. " },

          // Evidence
          { type: "text", text: "A single orange provides over 100% of your daily vitamin C requirement, which is essential for maintaining good health, " },

          // Assumption
          { type: "text", text: "assuming you don't have too much. " },

          // Implication
          { type: "text", text: "Therefore, if people ate more oranges, overall public health would improve. " },

          // Question
          { type: "text", text: "Have you ever felt refreshed after peeling and eating an orange? " },

          // Counter Argument
          { type: "text", text: "Some people prefer apples because they are easier to carry and eat while traveling. " },

          // Cause
          { type: "text", text: "Growing oranges requires large amounts of water, leading to environmental challenges in dry areas." }
        ]
      }
    ]
  }
};

export const MainPage = () => {
  const [mode, setMode] = useState<"input" | "analysis">("input");
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isMigrating, setIsMigrating] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sampleGenerated, setSampleGenerated] = useState(false);
  const [editorKey, setEditorKey] = useState<number>(0);

  // Run the migration when the component mounts
  useEffect(() => {
    const runMigration = async () => {
      try {
        await ensureMainSession();
      } catch (error) {
        console.error("Migration error:", error);
        setError("Failed to initialize session. Please refresh the page.");
      } finally {
        setIsMigrating(false);
      }
    };
    
    runMigration();
  }, []);

  // Query the session
  const session = useLiveQuery(async () => {
    if (isMigrating) return null;
    
    try {
      // Try to get the main session
      let mainSession = await SessionManager.getSession(MAIN_SESSION_ID);
      
      // If it still doesn't exist for some reason, create it
      if (!mainSession) {
        await SessionManager.createSession("", EMPTY_DOCUMENT);
        mainSession = await SessionManager.getSession(MAIN_SESSION_ID);
      }
      
      return mainSession;
    } catch (error) {
      console.error("Error fetching session:", error);
      setError("Failed to load session");
      return null;
    }
  }, [isMigrating]);

  // Get content based on the mode
  const content = useLiveQuery(async () => {
    if (!session) return null;
    try {
      const result = await SessionManager.getEffectiveContent(MAIN_SESSION_ID);
      return result;
    } catch (error) {
      console.error("Error fetching content:", error);
      return null;
    }
  }, [session?.id, mode]);

  // Update topic
  const handleTopicChange = useCallback(async (newTopic: string) => {
    setTopic(newTopic);
    setIsDirty(true);
    
    try {
      await SessionManager.updateSessionTitle(MAIN_SESSION_ID, newTopic);
    } catch (error) {
      console.error("Error updating topic:", error);
    }
  }, []);

  // Update content in input mode
  const handleContentChange = useCallback(async (json: RemirrorJSON) => {
    setIsDirty(true);
    try {
      await SessionManager.updateInputContent(MAIN_SESSION_ID, json);
    } catch (error) {
      console.error("Error updating content:", error);
    }
  }, []);

  // Handle the editor change in analysis mode
  const handleEditorChange = useCallback(
    async (json: RemirrorJSON, options?: { skipExtraction?: boolean }) => {
      if (!session?.analysedContent) return;
      
      try {
        // Get current highlights and relationships
        const currentHighlights = session.analysedContent.highlights || [];
        const currentRelationships = session.analysedContent.relationships || [];

        // If we're in a highlight removal state, preserve the content as-is
        if (options?.skipExtraction) {
          await SessionManager.updateAnalysedContent(
            MAIN_SESSION_ID,
            json,
            [], // Empty highlight array to preserve content
            currentRelationships
          );
        } else {
          // Extract highlights from the document
          const extractedHighlights =
            await SessionManager.extractHighlightsFromContentMarks(
              json,
              currentHighlights // Pass existing highlights to preserve positions
            );

          // Create a map of existing highlights by ID for quick lookup
          const existingHighlightsMap = new Map(
            currentHighlights.map((h) => [h.id, h])
          );

          // Check if any highlights were modified
          const hasHighlightModifications = extractedHighlights.some(
            (highlight) => {
              const existing = existingHighlightsMap.get(highlight.id);
              return existing && existing.text !== highlight.text;
            }
          );

          if (hasHighlightModifications) {
            // If highlights were modified, update both content and highlights
            await SessionManager.updateAnalysedContent(
              MAIN_SESSION_ID,
              json,
              extractedHighlights,
              currentRelationships
            );
          } else {
            // If no highlight modifications, just update the content
            await SessionManager.updateAnalysedContent(
              MAIN_SESSION_ID,
              json,
              currentHighlights,
              currentRelationships
            );
          }
        }
      } catch (error) {
        console.error("Error handling editor change:", error);
        setError("Error updating content. Please try again.");
      }
    },
    [session]
  );

  // Handler for analyze button
  const handleAnalyse = async () => {
    console.log("🔍 Analysis started", { isDirty, sessionId: MAIN_SESSION_ID });
    setIsAnalysing(true);
    setIsTransitioning(true);
    setError(null);
    
    try {
      // Save any pending changes
      const saveChanges = async () => {
        if (session?.inputContent) {
          console.log("💾 Saving input content before analysis");
          try {
            await SessionManager.updateInputContent(
              MAIN_SESSION_ID, 
              session.inputContent.content
            );
            console.log("✅ Input content saved successfully");
          } catch (error) {
            console.error("❌ Failed to save input content:", error);
            throw error;
          }
        }
      };
      
      // Perform the analysis
      console.log("🧠 Performing analysis");
      
      // Prevent page refresh on transient network errors
      let analysisAttempts = 0;
      const maxAttempts = 3;
      let lastError = null;
      let result = null;
      
      while (analysisAttempts < maxAttempts) {
        try {
          result = await performAnalysis({
            sessionId: MAIN_SESSION_ID,
            content: session?.inputContent?.content || EMPTY_DOCUMENT,
            isDirty,
            saveChanges,
          });
          
          // If successful, break out of retry loop
          if (result.success) {
            break;
          }
          
          // Store error and try again
          lastError = result.error;
          analysisAttempts++;
          
          if (analysisAttempts < maxAttempts) {
            console.log(`⚠️ Analysis attempt ${analysisAttempts} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        } catch (attemptError) {
          console.error(`🚨 Analysis attempt ${analysisAttempts + 1} error:`, attemptError);
          lastError = attemptError instanceof Error ? attemptError.message : String(attemptError);
          analysisAttempts++;
          
          if (analysisAttempts < maxAttempts) {
            console.log(`⚠️ Analysis attempt ${analysisAttempts} failed with error, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }
      
      if (!result || !result.success) {
        console.error("❌ All analysis attempts failed:", lastError);
        throw new Error(lastError || "Analysis failed after multiple attempts");
      }
      
      console.log("📊 Analysis result:", result);
      
      if (result.success) {
        console.log("✅ Analysis successful, switching to analysis mode");
        // Switch to analysis mode after successful analysis
        setMode("analysis");
        setIsDirty(false);
      } else {
        console.error("❌ Analysis failed:", result.error);
        setError(result.error || "Analysis failed");
        // Don't switch modes on failure
      }
    } catch (error) {
      console.error("🚨 Error during analysis:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      // Don't switch modes on error
    } finally {
      console.log("🏁 Analysis process completed");
      setIsAnalysing(false);
      // Add a small delay before removing the transition state to ensure smooth UI
      setTimeout(() => {
        console.log("⏱️ Transition state removed");
        setIsTransitioning(false);
      }, 300); // Increased delay to ensure UI is stable
    }
  };

  // Handler for back to input button
  const handleBackToInput = useCallback(async () => {
    try {
      // Reset the session to a blank state
      await SessionManager.updateInputContent(MAIN_SESSION_ID, EMPTY_DOCUMENT);
      await SessionManager.updateAnalysedContent(MAIN_SESSION_ID, EMPTY_DOCUMENT, [], []);
      await SessionManager.updateSessionTitle(MAIN_SESSION_ID, "");
      
      // Reset local state
      setTopic("");
      setIsDirty(false);
      setMode("input");
    } catch (error) {
      console.error("Error resetting session:", error);
      setError("Failed to reset session");
    }
  }, []);

  // Handler for generating sample content
  const handleGenerateSample = useCallback(async () => {
    try {
      // First update the session data
      await SessionManager.updateSessionTitle(MAIN_SESSION_ID, sampleContent.topic);
      await SessionManager.updateInputContent(MAIN_SESSION_ID, sampleContent.content);
      
      // Then update the UI state
      setTopic(sampleContent.topic);
      setIsDirty(true);
      setSampleGenerated(true);
      
      // Force editor re-render with a new key
      setEditorKey(prev => prev + 1);
    } catch (error) {
      console.error("Error generating sample:", error);
      setError("Failed to generate sample content");
    }
  }, []);

  // Load topic when session loads
  useEffect(() => {
    if (session) {
      // Only set topic if it's not empty
      if (session.title && session.title !== "Main Session") {
        setTopic(session.title);
      }
    }
  }, [session]);

  // ✅ Move ALL hooks before any conditional returns
  useEffect(() => {
    console.log("Mode changed to:", mode);
  }, [mode]);
  
  useEffect(() => {
    if (session) {
      console.log("Session updated:", { 
        id: session.id,
        hasInputContent: !!session.inputContent,
        hasAnalysedContent: !!session.analysedContent,
        highlightCount: session.analysedContent?.highlights?.length || 0
      });
    }
  }, [session]);
  
  // Then conditional returns
  if (isMigrating || !session || !content || isTransitioning) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">
          {isMigrating ? "Preparing application..." : 
           isTransitioning ? "Analysing..." : 
           "Loading..."}
        </span>
      </div>
    );
  }

  // Determine if we should show the analysis button
  const shouldShowAnalysisButton = mode === "input" && (!session?.analysedContent || !session?.analysedContent.highlights?.length);

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Header section with title and buttons */}
      <div className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-[#333333]">
              Research Prototype: LLMs to help you think better.
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4 gap-4">
            <p className="text-[#666666] max-w-xl">
              {mode === "input"
                ? "Enter your text below for an AI-assisted analysis of its logical structure."
                : "Review the AI-suggested structure labels. You can edit or add your own labels by selecting text and using the highlight buttons."}
            </p>
            
            <div className="flex gap-2 shrink-0">
              {mode === "input" && (
                <button
                  onClick={handleGenerateSample}
                  className="px-4 py-2 border border-gray-200 text-[#333333] rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Sample
                </button>
              )}
              {mode === "input" ? (
                <button
                  onClick={handleAnalyse}
                  disabled={isAnalysing}
                  className="px-4 py-2 bg-[#5CB85C] text-white rounded-lg hover:bg-[#4c9a4c] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isAnalysing && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {isAnalysing ? "Analysing..." : "Analyse Text"}
                </button>
              ) : (
                <button
                  onClick={handleBackToInput}
                  className="px-4 py-2 border border-gray-200 text-[#333333] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Input
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg mb-4 border border-red-200">
          {error}
        </div>
      )}

      {/* Main content area */}
      <div className="space-y-6">
        {/* Sample text section - appears only in input mode */}
        {mode === "input" && (
          <div className="p-5 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-lg font-medium text-[#333333] mb-3">How This Tool Works</h2>
            <p className="text-[#666666] mb-4">
              This research tool helps identify the logical structure of your writing by labelling different elements:
            </p>
            <ul className="list-disc pl-5 text-[#666666] space-y-2">
              <li><span className="font-medium">Claim</span> - statements or assertions you make</li>
              <li><span className="font-medium">Evidence</span> - facts, examples, or data supporting claims</li>
              <li><span className="font-medium">Assumption</span> - underlying beliefs taken as true without proof</li>
              <li><span className="font-medium">Implication</span> - logical consequences or outcomes that follow</li>
              <li><span className="font-medium">Question</span> - inquiries or points of exploration</li>
              <li><span className="font-medium">Counter Argument</span> - opposing viewpoints or objections</li>
              <li><span className="font-medium">Cause</span> - factors that lead to a particular outcome or effect</li>
            </ul>
            <p className="text-[#666666] mt-4">
              Write or paste your text in the editor below, then click "Analyse Text" to see the structure. You can edit the AI's labels or add your own in the analysis view.
            </p>
          </div>
        )}

        {/* Conditional content based on mode */}
        {mode === "input" ? (
          <div key="input-mode" className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <label className="uppercase text-[#666666] text-sm font-medium mb-2 block tracking-wider">
                Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => handleTopicChange(e.target.value)}
                placeholder="What is your text about?"
                className="w-full px-5 py-4 border border-gray-200 rounded-lg remirror-theme transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#5CB85C] focus:border-transparent"
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <label className="uppercase text-[#666666] text-sm font-medium mb-2 block tracking-wider">
                Your Text
              </label>
              <div className="min-h-[400px]">
                <Editor
                  key={`input-editor-${mode}-${editorKey}`}
                  placeholder="Enter your text here. After analysis, the AI will identify claims, evidence, questions, and other logical elements."
                  initialContent={sampleGenerated ? sampleContent.content : content.content}
                  onChangeJSON={handleContentChange}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="remirror-theme bg-white rounded-lg border border-gray-200 p-5 shadow-sm" key="analysis-mode">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-[#333333] mb-2">Analysis Results</h2>
              <p className="text-[#666666]">
                Review the labeled elements below. Select text to add new labels or edit existing ones.
              </p>
            </div>
            <Editor
              key={`analysis-editor-${mode}-${content?.highlights?.length || 0}`}
              initialContent={content.content}
              showHighlightButtons={true}
              renderSidebar={true}
              highlights={content.highlights || []}
              relationships={content.relationships || []}
              onChangeJSON={handleEditorChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}; 