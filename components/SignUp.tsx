import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from './Header';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const SignUp: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    if (!fullName || !email || !password || !address || !whatsapp) {
      setError('Todos os campos são obrigatórios.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      setIsLoading(false);
      return;
    }

    try {
      // Criar conta no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Salvar dados adicionais no Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        email,
        address,
        whatsapp,
        subscriptionStatus: 'none',
        trialEndsAt: null,
        createdAt: new Date().toISOString()
      });

      // Redireciona para o login após o sucesso
      navigate('/login');
    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso. Por favor, escolha outro.');
      } else if (error.code === 'auth/weak-password') {
        setError('A senha é muito fraca. Por favor, escolha uma senha mais forte.');
      } else if (error.code === 'auth/invalid-email') {
        setError('O e-mail fornecido é inválido.');
      } else {
        setError('Erro ao criar conta. Por favor, tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center min-h-screen">
      <Header />
      <div className="w-full max-w-md mt-8">
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl border border-white/20 shadow-lg p-8 animate-fade-in-scale-up">
          <h2 className="font-cinzel text-2xl text-center font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-200 mb-6">
            Crie seu Acesso
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campos de Cadastro */}
            <input type="text" placeholder="Nome Completo" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-3 bg-black/20 border border-orange-400/50 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 text-gray-200 placeholder-gray-500" required />
            <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-black/20 border border-orange-400/50 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 text-gray-200 placeholder-gray-500" required />
            <input type="text" placeholder="Endereço Completo" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-3 bg-black/20 border border-orange-400/50 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 text-gray-200 placeholder-gray-500" required />
            <input type="text" placeholder="Número de WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full p-3 bg-black/20 border border-orange-400/50 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 text-gray-200 placeholder-gray-500" required />
            <hr className="border-orange-400/20 my-2" />
            
            <div className="relative">
              <input type={isPasswordVisible ? 'text' : 'password'} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 pr-10 bg-black/20 border border-orange-400/50 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 text-gray-200 placeholder-gray-500" required />
              <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-orange-300 transition-colors" aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}>
                  {isPasswordVisible ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A10.025 10.025 0 00.458 10c1.274 4.057 5.022 7 9.542 7 .847 0 1.669-.105 2.454-.303z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                  )}
              </button>
            </div>
             <div className="relative">
              <input type={isPasswordVisible ? 'text' : 'password'} placeholder="Confirme a Senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 pr-10 bg-black/20 border border-orange-400/50 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-300 text-gray-200 placeholder-gray-500" required />
            </div>
            
            {error && <p className="text-orange-400 text-sm text-center">{error}</p>}
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full mt-4 px-6 py-3 font-cinzel font-bold text-white bg-gradient-to-r from-orange-600 to-amber-700 rounded-lg hover:from-orange-700 hover:to-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-orange-500 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>
           <p className="text-center text-sm text-gray-400 mt-6">
              Já possui uma chave?{' '}
              <Link to="/login" className="font-medium text-orange-400 hover:text-orange-300 transition-colors">
                Entre no portal
              </Link>
            </p>
        </div>
      </div>
    </main>
  );
};

export default SignUp;
