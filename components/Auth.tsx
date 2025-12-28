import React, { useState } from 'react';
import { LogoIcon, GoogleIcon } from './Icons';
import { loginWithUsername, signupWithUsername, loginWithGoogle } from '../services/firebaseService';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.username || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await loginWithUsername(formData.username, formData.password);
        // App.tsx listener handles state change
      } else {
        if (!formData.name) {
          setError("Display name is required");
          setLoading(false);
          return;
        }
        await signupWithUsername(formData.username, formData.password, formData.name);
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Authentication failed.";
      if (err.code === 'auth/invalid-credential') msg = "Invalid username or password.";
      if (err.code === 'auth/email-already-in-use') msg = "Username already taken.";
      if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      if (err.message.includes('configuration')) msg = "Firebase config missing in services/firebaseConfig.ts";
      
      setError(msg);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      // App.tsx listener handles redirection
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      let msg = "Google Sign-In failed.";
      if (err.message && err.message.includes("Database not found")) {
        msg = err.message;
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = "Sign-in cancelled.";
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg transform rotate-3">
            <LogoIcon className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Patr</h1>
          <p className="text-gray-500 mt-2">
            {isLogin ? "Welcome back!" : "Create your account"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-gray-50"
                placeholder="John Doe"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-gray-50"
              placeholder="username"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-gray-50"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-primary-500/30 transform transition-all active:scale-[0.98] mt-2 flex justify-center"
          >
             {loading && !error ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isLogin ? "Log In" : "Sign Up")}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-100"></div>
          <span className="px-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Or</span>
          <div className="flex-1 border-t border-gray-100"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-3 active:scale-[0.98]"
        >
          <GoogleIcon className="w-5 h-5" />
          <span>Sign in with Google</span>
        </button>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-primary-600 font-medium hover:text-primary-700 text-sm"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;