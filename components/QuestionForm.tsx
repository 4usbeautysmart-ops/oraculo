import React, { useRef, useEffect } from 'react';

interface QuestionFormProps {
  question: string;
  setQuestion: (question: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  isLoading: boolean;
  setIsTyping: (isTyping: boolean) => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ question, setQuestion, onSubmit, isLoading, setIsTyping }) => {
  const typingTimeoutRef = useRef<number | null>(null);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);

    // Set typing to true immediately
    setIsTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a new timeout to set typing to false after 500ms of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
    }, 500);
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <label htmlFor="question-input" className="block mb-2 text-sm font-medium text-orange-300">
        Sussure sua dúvida ao cosmos...
      </label>
      <textarea
        id="question-input"
        value={question}
        onChange={handleQuestionChange}
        placeholder="O que é a consciência? Qual o propósito da existência?..."
        className="w-full p-4 bg-black/20 backdrop-blur-sm border border-orange-400/50 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 resize-none text-gray-200 placeholder-gray-500"
        rows={4}
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={isLoading || !question.trim()}
        className="w-full mt-4 px-6 py-3 font-cinzel font-bold text-white bg-gradient-to-r from-orange-600 to-amber-700 rounded-lg hover:from-orange-700 hover:to-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-orange-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
      >
        {isLoading ? 'Consultando as estrelas...' : 'Perguntar ao Oráculo'}
      </button>
    </form>
  );
};

export default QuestionForm;