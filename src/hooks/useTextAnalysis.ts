export const useTextAnalysis = () => {
  const analyzeText = (text: string) => {
    // For now, just log the text
    console.log('Analyzing text:', text);
  };

  return {
    analyzeText,
  };
}; 