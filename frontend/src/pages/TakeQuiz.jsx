import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ArrowLeft, 
  BookOpen, 
  Home,
  ChevronRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import QuizInterface from '../components/quiz/QuizInterface';
import { fetchQuizById } from '../store/slices/quizSlice';
import { fetchVideoById } from '../store/slices/videosSlice';
import { fetchUserProgress, getProgressStats } from '../store/slices/progressSlice';
import { fetchVideos } from '../store/slices/videosSlice';
import toast from 'react-hot-toast';

const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentQuiz, isLoading } = useSelector((state) => state.quiz);
  const { currentVideo } = useSelector((state) => state.videos);
  
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      const quiz = await dispatch(fetchQuizById({ quizId, includeAnswers: false })).unwrap();
      
      // Charger la vidéo associée si elle existe
      if (quiz.videoId) {
        try {
          await dispatch(fetchVideoById(quiz.videoId)).unwrap();
        } catch (error) {
          console.warn('Impossible de charger la vidéo associée:', error);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du quiz:', error);
      toast.error('Erreur lors du chargement du quiz');
      navigate('/learning-path');
    }
  };

  const handleQuizComplete = async (result) => {
    setQuizCompleted(true);
    setQuizResult(result);
    
    // Rediriger vers le parcours après un délai si le quiz est réussi
    if (result.passed) {
      // Rafraîchir les données de progression et les vidéos après un quiz réussi
      try {
        await Promise.all([
          dispatch(fetchUserProgress()).unwrap(),
          dispatch(fetchVideos({ accessible: true })).unwrap(),
          dispatch(getProgressStats()).unwrap()
        ]);
        console.log('✅ Données rafraîchies après quiz réussi');
      } catch (error) {
        console.error('Erreur lors du rafraîchissement des données:', error);
      }
      
      setTimeout(() => {
        navigate('/learning-path');
      }, 3000);
    }
  };

  const handleRetry = () => {
    setQuizCompleted(false);
    setQuizResult(null);
  };

  const handleGoToLearningPath = async () => {
    // Rafraîchir les données avant de naviguer
    try {
      await Promise.all([
        dispatch(fetchUserProgress()).unwrap(),
        dispatch(fetchVideos({ accessible: true })).unwrap(),
        dispatch(getProgressStats()).unwrap()
      ]);
      console.log('✅ Données rafraîchies avant navigation');
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données:', error);
    }
    navigate('/learning-path');
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBackToVideo = () => {
    if (currentVideo) {
      navigate(`/video/${currentVideo._id}/watch`);
    } else {
      navigate('/learning-path');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du quiz...</p>
        </div>
      </div>
    );
  }

  if (!currentQuiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Quiz non trouvé
          </h3>
          <p className="text-gray-500 mb-4">
            Le quiz que vous recherchez n'existe pas ou n'est pas accessible.
          </p>
          <button
            onClick={handleGoToLearningPath}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour au parcours
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm">
              <button
                onClick={handleGoHome}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Home className="w-4 h-4 mr-1" />
                Accueil
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={handleGoToLearningPath}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <BookOpen className="w-4 h-4 mr-1" />
                Parcours
              </button>
              {currentVideo && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={handleGoBackToVideo}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Vidéo {currentVideo.order}
                  </button>
                </>
              )}
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 font-medium">
                Quiz
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {currentVideo && (
                <button
                  onClick={handleGoBackToVideo}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour à la vidéo</span>
                </button>
              )}
              <button
                onClick={handleGoToLearningPath}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Parcours</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête du quiz */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {currentQuiz.title}
              </h1>
              {currentQuiz.description && (
                <p className="text-gray-600 mb-4">
                  {currentQuiz.description}
                </p>
              )}
              
              {/* Informations sur la vidéo associée */}
              {currentVideo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      Quiz de la vidéo {currentVideo.order}
                    </span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    {currentVideo.title}
                  </p>
                </div>
              )}
            </div>
            
            {/* Informations du quiz */}
            <div className="bg-gray-50 rounded-lg p-4 min-w-[200px]">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Questions :</span>
                  <span className="font-medium">{currentQuiz.questions?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Score requis :</span>
                  <span className="font-medium">{currentQuiz.passingScore}%</span>
                </div>
                {currentQuiz.timeLimit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Temps limite :</span>
                    <span className="font-medium">
                      {Math.floor(currentQuiz.timeLimit / 60)} min
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Difficulté :</span>
                  <span className="font-medium capitalize">
                    {currentQuiz.difficulty}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interface du quiz */}
        <div className="bg-white rounded-lg shadow">
          <QuizInterface
            quiz={currentQuiz}
            onQuizComplete={handleQuizComplete}
            onRetry={handleRetry}
            className=""
          />
        </div>

        {/* Message de résultat avec redirection */}
        {quizCompleted && quizResult && quizResult.passed && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  Quiz réussi !
                </h3>
                <p className="text-green-700">
                  Félicitations ! Vous avez débloqué la vidéo suivante.
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Score obtenu :</span>
                  <span className="font-medium ml-2">{quizResult.percentage}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Score requis :</span>
                  <span className="font-medium ml-2">{currentQuiz.passingScore}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Points :</span>
                  <span className="font-medium ml-2">
                    {quizResult.totalScore}/{quizResult.totalPoints}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Temps :</span>
                  <span className="font-medium ml-2">
                    {Math.floor(quizResult.timeSpent / 60)}:{(quizResult.timeSpent % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-green-600">
                Redirection automatique vers le parcours dans quelques secondes...
              </p>
              <button
                onClick={handleGoToLearningPath}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Continuer maintenant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TakeQuiz;
