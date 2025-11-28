import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "./Header";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Checagem especial para o administrador (mantém compatibilidade)
    if (email === "admin@jailson.com" && password === "J@ilson40") {
      const adminUser = {
        email: email,
        fullName: "Administrador",
        subscriptionStatus: "active", // Garante que o admin sempre tenha acesso
      };
      localStorage.setItem("loggedInUser", JSON.stringify(adminUser));
      setIsLoading(false);
      onLoginSuccess();
      return;
    }

    try {
      // Autenticar com Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Buscar dados adicionais do Firestore
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
        setIsLoading(false);
        onLoginSuccess();
      } else {
        // Se não encontrar no Firestore, criar um documento básico
        const user = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          fullName: firebaseUser.displayName || "Usuário",
          subscriptionStatus: "none",
          trialEndsAt: null,
        };
        localStorage.setItem("loggedInUser", JSON.stringify(user));
        setIsLoading(false);
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error("Erro ao fazer login:", error);
      setIsLoading(false);
      if (error.code === "auth/user-not-found") {
        setError("Usuário não encontrado. O cosmos não reconhece este acesso.");
      } else if (error.code === "auth/wrong-password") {
        setError("Senha incorreta. O cosmos não reconhece este acesso.");
      } else if (error.code === "auth/invalid-email") {
        setError("E-mail inválido.");
      } else if (error.code === "auth/invalid-credential") {
        setError("Credenciais inválidas. O cosmos não reconhece este acesso.");
      } else {
        setError("Erro ao fazer login. Por favor, tente novamente.");
      }
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-screen">
      <Header />
      <div className="w-full max-w-md mt-8">
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-8 animate-fade-in-scale-up">
          <h2 className="font-cinzel text-2xl text-center font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-200 mb-6">
            Portal de Acesso
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-sm font-medium text-orange-300"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail cósmico"
                className="w-full p-3 bg-black/20 border border-orange-400/50 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 text-gray-200 placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block mb-2 text-sm font-medium text-orange-300"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua chave secreta do universo"
                  className="w-full p-3 pr-10 bg-black/20 border border-orange-400/50 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 text-gray-200 placeholder-gray-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-orange-300 transition-colors"
                  aria-label={
                    isPasswordVisible ? "Ocultar senha" : "Mostrar senha"
                  }
                >
                  {isPasswordVisible ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781z"
                        clipRule="evenodd"
                      />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A10.025 10.025 0 00.458 10c1.274 4.057 5.022 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-orange-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 px-6 py-3 font-cinzel font-bold text-white bg-gradient-to-r from-orange-600 to-amber-700 rounded-lg hover:from-orange-700 hover:to-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-orange-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-6">
            Ainda não tem uma chave?{" "}
            <Link
              to="/signup"
              className="font-medium text-orange-400 hover:text-orange-300 transition-colors"
            >
              Crie sua conta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default Login;
