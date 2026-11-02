import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import logoEdan from './logoedan.png';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message === 'Invalid login credentials' 
        ? 'Email atau password salah!' 
        : error.message);
    } else {
      onLoginSuccess(data.session);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl backdrop-blur-xl space-y-6">
        
        <div className="text-center space-y-2">
          <img src={logoEdan} alt="Logo EDAN" className="w-16 h-16 mx-auto object-contain rounded-2xl" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Login <span className="text-emerald-400">EDAN Stock</span>
          </h1>
          <p className="text-slate-400 text-xs">Masukkan akun internal kantor untuk mengakses sistem</p>
        </div>

        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl font-medium text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-all"
              placeholder="admin@perusahaan.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Proses Login...' : 'Masuk Dashboard'}
          </button>
        </form>

      </div>
    </div>
  );
}