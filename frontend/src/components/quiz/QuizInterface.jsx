import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Trophy,
  AlertCircle
} from 'lucide-react';
import { evaluateQuiz } from '../../store/slices/quizSlice';
import toast from 'react-hot-toast';

const QuizInterface = ({ 
  quiz, 
  onQuizComplete, 
  onRetry,
  className = '' 
}) => {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.quiz);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Initialiser le quiz
  useEffect(() => {
    if (quiz) {
      setCurrentQuestionIndex(0);
      setAnswers({});
      setQuizStarted(false);
      setQuizCompleted(false);
      setQuizResult(null);
      setShowResults(false);
      
      // Initialiser le temps si le quiz a une limite de temps
      if (quiz.timeLimit && quiz.timeLimit > 0) {
        setTimeRemaining(quiz.timeLimit);
      }
    }
  }, [quiz]);

  // Gestion du timer global du quiz
  useEffect(() => {
    if (quizStarted && !quizCompleted && timeRemaining !== null && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizStarted, quizCompleted, timeRemaining]);

  // Gestion du temps écoulé
  const handleTimeUp = () => {
    setQuizCompleted(true);
    setShowResults(true);
    toast.error('⏰ Temps écoulé ! Le quiz est terminé.');
    submitQuiz();
  };

  // Démarrer le quiz
  const startQuiz = () => {
    setQuizStarted(true);
    startTimeRef.current = Date.now();
    setQuestionStartTime(Date.now());
  };

  // Gestion des réponses
  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Passer à la question suivante
  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setQuestionStartTime(Date.now());
    }
  };

  // Revenir à la question précédente
  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setQuestionStartTime(Date.now());
    }
  };

  // Soumettre le quiz
  const submitQuiz = async () => {
    if (!quizStarted || quizCompleted) return;

    try {
      const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      const result = await dispatch(evaluateQuiz({
        quizId: quiz._id,
        answers,
        timeSpent: totalTime
      })).unwrap();

      console.log('📥 Réponse reçue du backend:', result);
      console.log('📊 Détails du résultat:');
      console.log('   - percentage:', result.percentage);
      console.log('   - totalScore:', result.totalScore);
      console.log('   - totalPoints:', result.totalPoints);
      console.log('   - passed:', result.passed);

      setQuizResult(result);
      setQuizCompleted(true);
      setShowResults(true);

      // Appeler le callback de completion
      if (onQuizComplete) {
        onQuizComplete(result);
      }

      // Afficher le message de résultat
      if (result.passed) {
        toast.success(`🎉 Félicitations ! Vous avez réussi le quiz avec ${result.percentage || 0}% !`);
      } else {
        toast.error(`❌ Quiz échoué avec ${result.percentage || 0}%. Score requis : ${quiz.passingScore}%`);
      }

    } catch (error) {
      console.error('Erreur lors de la soumission du quiz:', error);
      toast.error('Erreur lors de la soumission du quiz');
    }
  };

  // Recommencer le quiz
  const retryQuiz = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setQuizStarted(false);
    setQuizCompleted(false);
    setQuizResult(null);
    setShowResults(false);
    setTimeRemaining(quiz.timeLimit || null);
    
    if (onRetry) {
      onRetry();
    }
  };

  // Rendu d'une question
  const renderQuestion = (question) => {
    switch (question.type) {
      case 'multiple-choice':
        // Vérifier si plusieurs réponses sont correctes pour déterminer le mode (radio vs checkbox)
        const correctOptionsCount = question.options.filter(opt => opt.isCorrect).length;
        const isMultipleCorrect = correctOptionsCount > 1;
        
        // Gérer les réponses (array pour plusieurs réponses, string pour une seule)
        let currentAnswer = answers[question._id];
        if (isMultipleCorrect) {
          currentAnswer = Array.isArray(currentAnswer) ? currentAnswer : (currentAnswer ? [currentAnswer] : []);
        } else {
          currentAnswer = Array.isArray(currentAnswer) ? currentAnswer[0] : (currentAnswer || '');
        }
        const answerArray = isMultipleCorrect 
          ? (Array.isArray(currentAnswer) ? currentAnswer : [])
          : [];
        
        return (
          <div className="space-y-3">
            {isMultipleCorrect && (
              <p className="text-sm text-section-blue mb-2 font-medium font-ginka p-charte">
                ⚠️ Plusieurs réponses possibles - Cochez toutes les bonnes réponses
              </p>
            )}
            {question.options.map((option) => {
              const isSelected = isMultipleCorrect 
                ? answerArray.includes(option._id) 
                : (currentAnswer === option._id || currentAnswer === option._id.toString());
              
              return (
                <label
                  key={option._id}
                  className={`flex items-center p-4 rounded-charte-media border-2 cursor-pointer transition-all font-ginka p-charte ${
                    isSelected
                      ? 'border-section-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type={isMultipleCorrect ? "checkbox" : "radio"}
                    name={`question_${question._id}`}
                    value={option._id}
                    checked={isSelected}
                    onChange={(e) => {
                      if (isMultipleCorrect) {
                        // Gérer les réponses multiples
                        const newAnswer = e.target.checked
                          ? [...answerArray, option._id]
                          : answerArray.filter(id => id !== option._id);
                        handleAnswerChange(question._id, newAnswer);
                      } else {
                        // Gérer une seule réponse
                        handleAnswerChange(question._id, e.target.value);
                      }
                    }}
                    className="sr-only"
                  />
                  <div className={`mr-3 flex items-center justify-center ${
                    isMultipleCorrect 
                      ? `w-5 h-5 border-2 rounded-charte-media ${isSelected ? 'border-section-blue bg-section-blue' : 'border-gray-300'}`
                      : `w-5 h-5 rounded-full border-2 ${isSelected ? 'border-section-blue bg-section-blue' : 'border-gray-300'}`
                  }`}>
                    {isSelected && (
                      <div className={isMultipleCorrect 
                        ? "w-3 h-3 bg-white rounded" 
                        : "w-2 h-2 rounded-full bg-white"
                      }></div>
                    )}
                  </div>
                  <span className="flex-1">{option.text}</span>
                </label>
              );
            })}
          </div>
        );

      case 'true-false':
        const trueFalseAnswer = answers[question._id] || '';
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <label
                key={option._id}
                className={`flex items-center p-4 rounded-charte-media border-2 cursor-pointer transition-all font-ginka p-charte ${
                  trueFalseAnswer === option._id
                    ? 'border-section-blue bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`question_${question._id}`}
                  value={option._id}
                  checked={trueFalseAnswer === option._id}
                  onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                  trueFalseAnswer === option._id
                    ? 'border-section-blue bg-section-blue'
                    : 'border-gray-300'
                }`}>
                  {trueFalseAnswer === option._id && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <span className="flex-1">{option.text}</span>
              </label>
            ))}
          </div>
        );

      case 'text-input':
        const textAnswer = answers[question._id] || '';
        return (
          <div>
            <textarea
              value={textAnswer}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Tapez votre réponse ici..."
              className="w-full p-4 border-2 border-gray-200 rounded-charte-media focus:border-primary-red focus:outline-none resize-none font-ginka p-charte"
              rows={4}
            />
          </div>
        );

      default:
        return <div>Type de question non supporté</div>;
    }
  };

  // Rendu des résultats
  const renderResults = () => {
    if (!quizResult) return null;

    return (
      <div className="space-y-6">
        {/* Résumé global */}
        <div className={`p-6 rounded-charte-media border-2 ${
          quizResult.passed 
            ? 'border-section-green bg-green-50' 
            : 'border-primary-red bg-red-50'
        }`}>
          <div className="flex items-center justify-center mb-4">
            {quizResult.passed ? (
              <Trophy className="w-12 h-12 text-section-green" />
            ) : (
              <AlertCircle className="w-12 h-12 text-primary-red" />
            )}
          </div>
          
          <h3 className={`text-2xl font-bold text-center mb-2 font-ginka h2-charte ${
            quizResult.passed ? 'text-section-green' : 'text-primary-red'
          }`}>
            {quizResult.passed ? 'Quiz Réussi !' : 'Quiz Échoué'}
          </h3>
          
          <div className="text-center space-y-2">
            <p className="text-lg font-ginka h5-charte">
              <span className="font-semibold">Score :</span> {quizResult.totalScore || 0}/{quizResult.totalPoints || 0} points
            </p>
            <p className="text-lg font-ginka h5-charte">
              <span className="font-semibold">Pourcentage :</span> {quizResult.percentage || 0}%
            </p>
            <p className="text-sm text-gray-600 font-ginka p-charte">
              Score requis : {quiz.passingScore || 0}%
            </p>
          </div>
        </div>

        {/* Détail des questions */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold font-ginka h4-charte">Détail des réponses :</h4>
          {quizResult.results.map((result, index) => {
            const question = quiz.questions[index];
            return (
              <div
                key={question._id}
                className={`p-4 rounded-charte-media border font-ginka p-charte ${
                  result.isCorrect 
                    ? 'border-section-green bg-green-50' 
                    : 'border-primary-red bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium">{question.question}</h5>
                  <div className="flex items-center">
                    {result.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-section-green" />
                    ) : (
                      <XCircle className="w-5 h-5 text-primary-red" />
                    )}
                  </div>
                </div>
                
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Votre réponse :</span> {
                    question.type === 'multiple-choice' && Array.isArray(result.userAnswer)
                      ? result.userAnswer.map(id => {
                          const opt = question.options.find(o => o._id === id);
                          return opt ? opt.text : id;
                        }).join(', ')
                      : (result.userAnswer || 'Aucune réponse')
                  }</p>
                  {!result.isCorrect && question.type === 'multiple-choice' && (
                    <p><span className="font-medium">Bonnes réponses :</span> {
                      question.options
                        .filter(opt => opt.isCorrect)
                        .map(opt => opt.text)
                        .join(', ')
                    }</p>
                  )}
                  <p><span className="font-medium">Points :</span> {result.points}/{question.points}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-center space-x-4">
          {!quizResult.passed && quiz.allowRetake && (
            <button
              onClick={retryQuiz}
              className="btn-charte btn-charte-primary flex items-center space-x-2 px-6 py-3"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Recommencer</span>
            </button>
          )}
          
          {quizResult.passed && (
            <div className="text-center">
              <p className="text-sm text-green-600 mb-4">
                Redirection automatique vers le parcours dans quelques secondes...
              </p>
              <button
                onClick={() => window.location.href = '/learning-path'}
                className="btn-charte btn-charte-success flex items-center space-x-2 px-6 py-3 mx-auto"
              >
                <ArrowRight className="w-5 h-5" />
                <span>Continuer maintenant</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!quiz) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <p className="text-gray-500">Aucun quiz disponible</p>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className={`p-6 ${className}`}>
        {renderResults()}
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-4 font-ginka h2-charte">{quiz.title}</h2>
          {quiz.description && (
            <p className="text-gray-600 mb-6 font-ginka p-charte">{quiz.description}</p>
          )}
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Questions :</span> {quiz.questions.length}
              </div>
              <div>
                <span className="font-medium">Score requis :</span> {quiz.passingScore}%
              </div>
              {quiz.timeLimit > 0 && (
                <div className="col-span-2">
                  <span className="font-medium">Temps limite :</span> {Math.floor(quiz.timeLimit / 60)} minutes
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={startQuiz}
            className="btn-charte btn-charte-primary w-full px-6 py-3 font-medium"
          >
            Commencer le quiz
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <div className={`p-6 ${className}`}>
      {/* En-tête du quiz */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold font-ginka h3-charte">{quiz.title}</h2>
          <p className="text-sm text-gray-600 font-ginka p-charte">
            Question {currentQuestionIndex + 1} sur {quiz.questions.length}
          </p>
        </div>
        
        {timeRemaining !== null && (
          <div className="flex items-center space-x-2 text-section-yellow font-ginka p-charte">
            <Clock className="w-5 h-5" />
            <span className="font-mono text-lg">
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Barre de progression */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progression</span>
          <span>{Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-section-blue h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 font-ginka h4-charte">
          {currentQuestion.question}
        </h3>
        {currentQuestion.points > 1 && (
          <p className="text-sm text-gray-500 mb-4 font-ginka p-charte">
            {currentQuestion.points} points
          </p>
        )}
        {renderQuestion(currentQuestion)}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={previousQuestion}
          disabled={isFirstQuestion}
          className={`flex items-center space-x-2 px-4 py-2 rounded-charte-media transition-colors font-ginka p-charte ${
            isFirstQuestion
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Précédent</span>
        </button>

        <div className="flex space-x-2">
          {isLastQuestion ? (
            <button
              onClick={submitQuiz}
              disabled={isLoading}
              className="btn-charte btn-charte-success flex items-center space-x-2 px-6 py-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>Terminer le quiz</span>
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="btn-charte btn-charte-primary flex items-center space-x-2 px-4 py-2"
            >
              <span>Suivant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;
