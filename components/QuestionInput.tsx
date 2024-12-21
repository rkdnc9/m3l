import { detectVisualizationIntent } from '../src/utils/visualizationUtils';
import ResultsPane from './ResultsPane';

interface QuestionInputProps {
  // ... existing props
}

const QuestionInput: React.FC<QuestionInputProps> = ({ /* ... */ }) => {
  const handleQuestionSubmit = async (question: string) => {
    try {
      // Check if the user wants visualization
      const shouldVisualize = detectVisualizationIntent(question);
      
      // Your existing code to get SQL and execute query
      const sql = await generateSQL(question);
      const results = await executeQuery(sql);
      
      setQueryResults({
        data: results,
        shouldVisualize,
        originalQuestion: question
      });
      
    } catch (error) {
      // ... error handling
    }
  };

  return (
    <div>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
      />
      <button onClick={() => handleQuestionSubmit(question)}>Ask</button>
      
      {queryResults && (
        <ResultsPane
          data={queryResults.data}
          shouldVisualize={queryResults.shouldVisualize}
          question={queryResults.originalQuestion}
        />
      )}
    </div>
  );
};

export default QuestionInput; 