"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, ArrowLeft, Sun, Moon, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiService } from '@/services/api';

interface SearchResult {
  document_id: string;
  title: string;
  filename: string;
  category: string;
  chunk_index: number;
  text: string;
  page_number: number | null;
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    // Auth check
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await apiService.searchDocumentsKeyword(query);
      setSearchResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background text-foreground transition-colors duration-300 p-6 flex flex-col items-center">
      {/* Header */}
      <div className="max-w-4xl w-full flex justify-between items-center mb-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Athena Search</span>
        </div>

        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 border border-border rounded-xl bg-card"
        >
          {darkMode ? <Sun className="h-4.5 w-4.5 text-yellow-400" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
      </div>

      <div className="max-w-4xl w-full space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent w-fit">
            Keyword Document Search
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Search all database documents for matching text segments. This search query is computed offline via SQL text matches (No AI embeddings).
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              required
              placeholder="Search documents for keywords (e.g. attendance, exam, criteria)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-md"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          </div>
          <button
            type="submit"
            className="bg-primary hover:bg-primary/95 text-white font-semibold px-8 rounded-2xl text-sm shadow-lg shadow-primary/20 cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Results */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4 pt-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{results.length} segments matched</p>
            {results.map((res, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-2.5 items-center">
                    <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm truncate max-w-sm">{res.title}</span>
                    <span className="text-[10px] text-slate-450 uppercase font-bold bg-slate-100 dark:bg-slate-805 px-2.5 py-0.5 rounded">
                      {res.category}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold font-mono">
                    Page {res.page_number || 'N/A'} (Segment {res.chunk_index})
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-l-2 border-primary/20 pl-3">
                  {res.text}
                </p>
              </motion.div>
            ))}
          </div>
        ) : query && (
          <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl shadow-sm">
            <p className="text-slate-500 text-sm font-semibold">No direct text segments found matching '{query}'.</p>
          </div>
        )}
      </div>
    </main>
  );
}
