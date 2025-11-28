import React, { useState, useCallback, useRef, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import QuestionForm from "./components/QuestionForm";
import ResponseDisplay from "./components/ResponseDisplay";
import History from "./components/History";
import OracleFace from "./components/OracleFace";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Subscription from "./components/Subscription";
import { askGuardian } from "./services/geminiService";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { listenToInstallPrompt, triggerInstall } from "./pwa";

interface HistoryEntry {
  id: number;
  question: string;
  response: string;
}

const HISTORY_STORAGE_KEY_PREFIX = "oracle_consciousness_history_";

// Componente do botão da Biblioteca
const LibraryButton: React.FC<{
  onClick: () => void;
  historyCount: number;
}> = ({ onClick, historyCount }) => {
  if (historyCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 p-3 rounded-full bg-orange-600/50 backdrop-blur-sm border border-orange-400/30 text-white shadow-lg hover:bg-orange-700/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-orange-500 transition-all duration-300 transform hover:scale-110"
      aria-label="Abrir biblioteca de respostas"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
      {historyCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
          {historyCount}
        </span>
      )}
    </button>
  );
};

// Componente do Modal da Biblioteca
const HistoryModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
  history: HistoryEntry[];
}> = ({ isVisible, onClose, history }) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div
        className="relative bg-gray-900/40 backdrop-blur-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-scale-up rounded-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-4 border-b border-gray-700/50">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Fechar biblioteca"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">
          <History history={history} />
        </div>
      </div>
    </div>
  );
};

const PAYMENT_FAILURE_STATUSES = ["canceled", "paused"];

const MainOracleInterface: React.FC<{
  onLogout: () => void;
  userEmail: string;
}> = ({ onLogout, userEmail }) => {
  const historyStorageKey = `${HISTORY_STORAGE_KEY_PREFIX}${userEmail}`;
  const navigate = useNavigate();
  const [question, setQuestion] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const storedHistory = localStorage.getItem(historyStorageKey);
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (error) {
      console.error("Falha ao analisar o histórico do localStorage", error);
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const lastQuestionRef = useRef<string>("");

  useEffect(() => {
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(history));
    } catch (error) {
      console.error("Falha ao salvar o histórico no localStorage", error);
    }
  }, [history, historyStorageKey]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion || isLoading) return;

      // Verificar status da assinatura/trial antes de permitir a pergunta
      let user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
      try {
        if (auth.currentUser) {
          const latestSnapshot = await getDoc(
            doc(db, "users", auth.currentUser.uid)
          );
          if (latestSnapshot.exists()) {
            const latestData = latestSnapshot.data();
            user = {
              uid: auth.currentUser.uid,
              email: auth.currentUser.email,
              fullName: latestData.fullName,
              address: latestData.address,
              whatsapp: latestData.whatsapp,
              subscriptionStatus: latestData.subscriptionStatus || "none",
              trialEndsAt: latestData.trialEndsAt || null,
            };
            localStorage.setItem("loggedInUser", JSON.stringify(user));
          }
        }
      } catch (fetchError) {
        console.error("Erro ao atualizar status do usuário:", fetchError);
      }

      if (!user) {
        navigate("/login");
        return;
      }

      // Verificar se o trial expirou
      if (
        user.subscriptionStatus === "trial" &&
        user.trialEndsAt &&
        Date.now() >= user.trialEndsAt
      ) {
        // Trial expirado, redirecionar para subscription
        navigate("/subscription", {
          state: {
            paymentErrorMessage:
              "Seu período de teste de 24 horas expirou. Assine o plano cósmico para continuar.",
          },
        });
        return;
      }

      // Verificar se tem assinatura ativa
      if (!checkSubscriptionStatus(user)) {
        const shouldShowPaymentMessage = PAYMENT_FAILURE_STATUSES.includes(
          user.subscriptionStatus
        );
        navigate("/subscription", {
          state: shouldShowPaymentMessage
            ? {
                paymentErrorMessage:
                  "Tentamos cobrar o seu plano, mas o pagamento não foi autorizado. Atualize sua assinatura para continuar.",
              }
            : undefined,
        });
        return;
      }

      if (response && lastQuestionRef.current) {
        setHistory((prevHistory) => [
          { id: Date.now(), question: lastQuestionRef.current, response },
          ...prevHistory,
        ]);
      }

      setResponse("");
      setError(null);
      setIsLoading(true);

      lastQuestionRef.current = trimmedQuestion;
      setQuestion("");

      try {
        const guardianResponse = await askGuardian(trimmedQuestion);
        setResponse(guardianResponse);
      } catch (e) {
        setError(
          "O Oráculo parece estar em meditação profunda. Por favor, tente novamente mais tarde."
        );
        console.error(e);
        lastQuestionRef.current = "";
      } finally {
        setIsLoading(false);
      }
    },
    [question, response, isLoading, navigate]
  );

  const isResponseReceived = !!response && !isLoading;

  return (
    <div className="min-h-screen text-slate-200 transition-colors duration-500">
      <main className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center">
        <Header />
        <OracleFace
          isResponseReceived={isResponseReceived}
          isTyping={isTyping}
        />
        <div className="w-full max-w-2xl flex flex-col items-center">
          <QuestionForm
            question={question}
            setQuestion={setQuestion}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            setIsTyping={setIsTyping}
          />
          <ResponseDisplay
            response={response}
            isLoading={isLoading}
            error={error}
            question={lastQuestionRef.current}
          />
        </div>
      </main>
      <LibraryButton
        onClick={() => setIsHistoryVisible(true)}
        historyCount={history.length}
      />
      <button
        onClick={onLogout}
        className="fixed bottom-4 left-4 z-40 p-3 rounded-full bg-red-600/80 backdrop-blur-sm border border-red-400/30 text-white shadow-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 transition-all duration-300 transform hover:scale-110"
        aria-label="Sair"
        title="Sair"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
      <HistoryModal
        isVisible={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
        history={history}
      />
    </div>
  );
};

const checkSubscriptionStatus = (user: any) => {
  if (!user) return false;
  if (user.email === "admin@jailson.com") return true; // Admin bypass
  if (user.subscriptionStatus === "active") return true;
  if (
    user.subscriptionStatus === "trial" &&
    user.trialEndsAt &&
    Date.now() < user.trialEndsAt
  ) {
    return true;
  }
  // Lógica para expirar o trial (opcional, pode ser feito na pág de sub)
  return false;
};

const ProtectedRoute: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");

  if (!user) {
    return <Navigate to="/login" />;
  }

  const hasActiveSubscription = checkSubscriptionStatus(user);

  if (!hasActiveSubscription) {
    return <Navigate to="/subscription" />;
  }

  return <MainOracleInterface onLogout={onLogout} userEmail={user.email} />;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    listenToInstallPrompt(() => {
      setShowInstall(true);
    });
  }, []);

  const handleInstall = async () => {
    const result = await triggerInstall();
    console.log(result);
  };

  const navigate = useNavigate();

  // Verificar autenticação persistente do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Buscar dados do usuário no Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const user = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              fullName: userData.fullName,
              address: userData.address,
              whatsapp: userData.whatsapp,
              subscriptionStatus: userData.subscriptionStatus || "none",
              trialEndsAt: userData.trialEndsAt || null,
            };
            localStorage.setItem("loggedInUser", JSON.stringify(user));
            setIsAuthenticated(true);
          } else {
            // Verificar se é admin (compatibilidade)
            const storedUser = JSON.parse(
              localStorage.getItem("loggedInUser") || "null"
            );
            if (storedUser && storedUser.email === "admin@jailson.com") {
              setIsAuthenticated(true);
            } else {
              setIsAuthenticated(false);
              localStorage.removeItem("loggedInUser");
            }
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
          setIsAuthenticated(false);
          localStorage.removeItem("loggedInUser");
        }
      } else {
        // Verificar se é admin (compatibilidade)
        const storedUser = JSON.parse(
          localStorage.getItem("loggedInUser") || "null"
        );
        if (storedUser && storedUser.email === "admin@jailson.com") {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem("loggedInUser");
        }
      }
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsAuthenticated(true);
    const user = JSON.parse(localStorage.getItem("loggedInUser") || "null");
    if (checkSubscriptionStatus(user)) {
      navigate("/");
    } else {
      navigate("/subscription");
    }
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
    localStorage.removeItem("loggedInUser");
    setIsAuthenticated(false);
    navigate("/login");
  }, [navigate]);

  // Mostrar loading enquanto verifica autenticação
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-black">
        <div className="text-orange-400 text-xl font-cinzel">
          Verificando acesso ao cosmos...
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {showInstall && (
        <button id="btn-install" onClick={handleInstall}>
          Adicionar à Tela de Início
        </button>
      )}
      <Route
        path="/login"
        element={
          !isAuthenticated ? (
            <Login onLoginSuccess={handleLoginSuccess} />
          ) : (
            <Navigate to="/" />
          )
        }
      />
      <Route
        path="/signup"
        element={!isAuthenticated ? <SignUp /> : <Navigate to="/" />}
      />
      <Route
        path="/subscription"
        element={isAuthenticated ? <Subscription /> : <Navigate to="/login" />}
      />
      <Route path="/" element={<ProtectedRoute onLogout={handleLogout} />} />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/" : "/login"} />}
      />
    </Routes>
  );
}

export default App;
