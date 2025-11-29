import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./Header";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  // const [isFocused, setIsFocused] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(
    null
  );
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const PAYMENT_FAILURE_STATUSES = ["canceled", "paused"];

  useEffect(() => {
    if (location.state?.paymentErrorMessage) {
      setPaymentErrorMessage(location.state.paymentErrorMessage);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    const loggedInUser = JSON.parse(
      localStorage.getItem("loggedInUser") || "null"
    );
    if (loggedInUser) {
      setUser(loggedInUser);

      // Verificar se o trial expirou
      if (
        loggedInUser.subscriptionStatus === "trial" &&
        loggedInUser.trialEndsAt &&
        Date.now() > loggedInUser.trialEndsAt
      ) {
        setIsTrialExpired(true);
      }

      // Verificar se o accessUntil expirou para assinaturas ativas
      if (
        loggedInUser.subscriptionStatus === "active" &&
        loggedInUser.accessUntil &&
        Date.now() >= loggedInUser.accessUntil
      ) {
        setPaymentErrorMessage(
          "Seu acesso expirou. Renove sua assinatura mensal para continuar usando o Oráculo."
        );
      }

      if (PAYMENT_FAILURE_STATUSES.includes(loggedInUser.subscriptionStatus)) {
        setPaymentErrorMessage(
          "Tentamos cobrar o seu plano, mas não conseguimos autorização. Atualize o método de pagamento para continuar."
        );
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  // Polling para verificar se o pagamento foi confirmado no Firebase
  useEffect(() => {
    const loggedInUser = JSON.parse(
      localStorage.getItem("loggedInUser") || "null"
    );

    if (!loggedInUser?.uid) return;

    // Se o usuário tem accessUntil, significa que pode estar aguardando confirmação
    if (loggedInUser.accessUntil && Date.now() < loggedInUser.accessUntil) {
      setIsCheckingPayment(true);
    }

    const pollInterval = setInterval(async () => {
      try {
        const userRef = doc(db, "users", loggedInUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) return;

        const firebaseData = snap.data();

        // Se o pagamento foi confirmado (status "active" com accessUntil válido)
        if (
          firebaseData.subscriptionStatus === "active" &&
          firebaseData.accessUntil &&
          Date.now() < firebaseData.accessUntil
        ) {
          // Atualiza o localStorage com os dados do Firebase
          const updatedUser = {
            ...loggedInUser,
            subscriptionStatus: firebaseData.subscriptionStatus,
            accessUntil: firebaseData.accessUntil,
          };
          localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));

          // Limpa a mensagem de erro e redireciona
          setPaymentErrorMessage(null);
          setIsCheckingPayment(false);
          clearInterval(pollInterval);
          navigate("/", { replace: true });
          return;
        }

        // Atualiza o estado do usuário se houver mudanças
        if (
          firebaseData.subscriptionStatus !== loggedInUser.subscriptionStatus
        ) {
          const updatedUser = {
            ...loggedInUser,
            subscriptionStatus: firebaseData.subscriptionStatus,
            accessUntil: firebaseData.accessUntil,
          };
          localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
          setUser(updatedUser);
          setIsCheckingPayment(false);

          // Se mudou para um status de erro, mostra a mensagem apropriada
          if (
            PAYMENT_FAILURE_STATUSES.includes(firebaseData.subscriptionStatus)
          ) {
            setPaymentErrorMessage(
              "Tentamos cobrar o seu plano, mas não conseguimos autorização. Atualize o método de pagamento para continuar."
            );
          }
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
      }
    }, 3000); // Verifica a cada 3 segundos

    return () => clearInterval(pollInterval);
  }, [navigate]);

  const handleStartTrial = async () => {
    const trialEndTime = Date.now() + 24 * 60 * 60 * 1000;
    const updatedUser = {
      ...user,
      subscriptionStatus: "trial",
      trialEndsAt: trialEndTime,
    };

    try {
      // Atualiza no Firestore se o usuário tiver uid (usuário do Firebase)
      if (user.uid && auth.currentUser) {
        await updateDoc(doc(db, "users", user.uid), {
          subscriptionStatus: "trial",
          trialEndsAt: trialEndTime,
        });
      }

      // Atualiza o usuário logado no localStorage
      localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));

      setPaymentErrorMessage(null);
      // Navega para a interface principal
      navigate("/");
    } catch (error) {
      console.error("Erro ao iniciar trial:", error);
      // Mesmo assim atualiza o localStorage para manter compatibilidade
      localStorage.setItem("loggedInUser", JSON.stringify(updatedUser));
      navigate("/");
    }
  };

  const handleSubscribe = async () => {
    try {
      const dadosDoPlano = {
        userId: user.uid,
        userEmail: user.email,
      };

      const resposta = await fetch("/api/createPayment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dadosDoPlano),
      });

      if (!resposta.ok) {
        const errorData = await resposta.json();
        throw new Error(
          errorData.error || "Falha ao comunicar com o servidor."
        );
      }

      const resultado = await resposta.json();

      console.log("Redirecionando para o checkout:", resultado);

      if (resultado.paymentUrl) {
        window.location.href = resultado.paymentUrl;
      } else {
        alert("Falha ao gerar o link de pagamento.");
      }
    } catch (error) {
      console.error("Erro ao atualizar assinatura:", error);
    }
  };

  const renderContent = () => {
    if (!user) {
      return <p className="text-center text-gray-400">Carregando...</p>;
    }

    // Se está verificando o pagamento, mostra tela de aguardo
    if (isCheckingPayment) {
      return (
        <>
          <p className="text-center text-green-400 mb-6">
            Confirmando seu pagamento...
          </p>
          <p className="text-center text-gray-300 mb-6">
            Você será redirecionado em breve. Por favor, aguarde.
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
          </div>
        </>
      );
    }

    if (isTrialExpired) {
      return (
        <>
          <p className="text-center text-orange-300 mb-6">
            Seu período de teste de 24 horas expirou.
          </p>
          <p className="text-center text-gray-300 mb-6">
            Para continuar sua jornada e receber a sabedoria do Oráculo, por
            favor, assine o Plano Cósmico.
          </p>
        </>
      );
    }

    if (user.subscriptionStatus === "trial") {
      const timeLeft = user.trialEndsAt - Date.now();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor(
        (timeLeft % (1000 * 60 * 60)) / (1000 * 60)
      );

      return (
        <p className="text-center text-green-400 mb-6">
          Você está em seu período de teste. Restam aproximadamente {hoursLeft}h
          e {minutesLeft}m.
        </p>
      );
    }

    // Verificar se o accessUntil expirou para assinaturas ativas
    if (
      user.subscriptionStatus === "active" &&
      user.accessUntil &&
      Date.now() >= user.accessUntil
    ) {
      return (
        <>
          <p className="text-center text-orange-300 mb-6">
            Seu acesso expirou.
          </p>
          <p className="text-center text-gray-300 mb-6">
            Para continuar sua jornada e receber a sabedoria do Oráculo, renove
            sua assinatura mensal.
          </p>
        </>
      );
    }

    if (PAYMENT_FAILURE_STATUSES.includes(user.subscriptionStatus)) {
      return (
        <>
          <p className="text-center text-red-300 mb-6">
            Não conseguimos autorizar o pagamento da sua assinatura. Atualize os
            dados para continuar recebendo as mensagens do Oráculo.
          </p>
          <p className="text-center text-gray-300 mb-6">
            Clique em &quot;Assinar Agora&quot; para revisar suas informações de
            pagamento.
          </p>
        </>
      );
    }

    // Status 'none'
    return (
      <>
        <p className="text-center text-gray-300 mb-6">
          Para começar sua jornada, ative seu período de teste gratuito de 24
          horas.
        </p>
        <button
          onClick={handleStartTrial}
          className="w-full max-w-sm mt-4 px-6 py-3 font-cinzel font-bold text-white bg-gradient-to-r from-green-600 to-teal-700 rounded-lg hover:from-green-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-all duration-300 transform hover:scale-105"
        >
          Ativar 24 Horas Grátis
        </button>
      </>
    );
  };

  return (
    <main className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-screen">
      <Header />
      <div className="w-full max-w-md mt-8">
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-8 animate-fade-in-scale-up">
          <h2 className="font-cinzel text-2xl text-center font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-200 mb-2">
            Plano Cósmico
          </h2>
          <p className="text-center font-cinzel text-4xl font-bold text-white mb-4">
            R$ 21,90
            <span className="text-lg font-normal text-gray-400">/mês</span>
          </p>

          {paymentErrorMessage && (
            <div className="mb-6 p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm text-center">
              {paymentErrorMessage}
            </div>
          )}

          <div className="text-center my-8">{renderContent()}</div>

          <hr className="border-orange-400/20 my-6" />

          <button
            onClick={handleSubscribe}
            className="w-full px-6 py-3 font-cinzel font-bold text-white bg-gradient-to-r from-orange-600 to-amber-700 rounded-lg hover:from-orange-700 hover:to-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-orange-500 transition-all duration-300 transform hover:scale-105"
          >
            Assinar Agora
          </button>
          <p className="text-center text-xs text-gray-500 mt-4">
            Você será redirecionado para um ambiente de pagamento seguro.
          </p>
        </div>
      </div>
    </main>
  );
};

export default Subscription;
