"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ShieldAlert, GraduationCap, ArrowRight, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiService } from '@/services/api';

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Sync theme
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Direct REST API Login using credentials
      const res = await apiService.login(username, password);
      
      // Store JWT token and session profiles
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('user_role', res.role);
      localStorage.setItem('user_name', res.username);
      localStorage.setItem('user_email', username);
      
      // Route based on role
      if (res.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background text-foreground flex flex-col justify-between p-6 relative transition-colors duration-300">
      {/* Decorative Blur Circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10"></div>

      {/* Top Header */}
      <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20 text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ATHENA
            </span>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Academic AI</p>
          </div>
        </div>

        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm"
        >
          {darkMode ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-slate-700" />}
        </button>
      </div>

      {/* Login Portal Card */}
      <div className="flex-1 flex items-center justify-center py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl relative overflow-hidden"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight">System Portal</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Log in to the RAG AI Academic Hub
            </p>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-6">
            <button
              onClick={() => {
                setRole('student');
                setUsername('');
                setPassword('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                role === 'student'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Student
            </button>
            <button
              onClick={() => {
                setRole('admin');
                setUsername('admin');
                setPassword('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                role === 'admin'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
              Admin Portal
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Username / Email
              </label>
              <input
                type="text"
                required
                placeholder={role === 'admin' ? "admin" : "qq489815@gmail.com"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 font-medium">{error}</p>
            )}

            {/* Helper Tips */}
            <div className="bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl text-[11px] text-slate-500 space-y-1">
              <p className="font-bold">Credential Tips:</p>
              {role === 'admin' ? (
                <p>Use username **admin** & password **password123**</p>
              ) : (
                <p>Use email **qq489815@gmail.com** & password **student123**</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/95 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 mt-6 cursor-pointer text-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-500">
        © 2026 Athena AI Academic Assistant. Fully functional production layout.
      </div>
    </main>
  );
}
