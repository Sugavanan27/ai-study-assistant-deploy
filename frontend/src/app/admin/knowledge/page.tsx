"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, BookOpen, Clock, FileText, ArrowLeft, RefreshCw, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiService } from '@/services/api';

interface Analytics {
  total_documents: number;
  total_chunks: number;
  vector_count: number;
  last_uploaded_document: string;
  storage_usage: string;
}

export default function KnowledgeManagement() {
  const router = useRouter();
  const [stats, setStats] = useState<Analytics>({
    total_documents: 0,
    total_chunks: 0,
    vector_count: 0,
    last_uploaded_document: 'N/A',
    storage_usage: '0 MB'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auth Check
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    if (!token || role !== 'admin') {
      router.push('/');
      return;
    }

    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAnalytics();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-background text-foreground transition-colors duration-300 p-6 flex flex-col items-center">
      {/* Header */}
      <div className="max-w-4xl w-full flex justify-between items-center mb-10">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </button>

        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-primary animate-pulse" />
          <span className="font-bold text-lg">Knowledge Registry</span>
        </div>

        <button 
          onClick={loadStats} 
          disabled={loading}
          className="p-2.5 border border-border rounded-xl bg-card hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Stats Block */}
      <div className="max-w-4xl w-full space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent w-fit">
            Knowledge Management Statistics
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Detailed hardware and database metrics for the Retrieval-Augmented Generation context registry.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm text-center">
            <div className="bg-primary/10 text-primary p-3 rounded-full w-fit mx-auto mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-2xl font-extrabold">{stats.total_documents}</p>
            <p className="text-[10px] text-slate-550 uppercase tracking-widest font-bold mt-1">Documents</p>
          </div>
          
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm text-center">
            <div className="bg-purple-100 dark:bg-purple-950/30 text-purple-600 p-3 rounded-full w-fit mx-auto mb-3">
              <BarChart2 className="h-6 w-6" />
            </div>
            <p className="text-2xl font-extrabold">{stats.total_chunks}</p>
            <p className="text-[10px] text-slate-555 uppercase tracking-widest font-bold mt-1">Chunks Segmented</p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm text-center">
            <div className="bg-green-100 dark:bg-green-955/30 text-green-600 p-3 rounded-full w-fit mx-auto mb-3">
              <Database className="h-6 w-6" />
            </div>
            <p className="text-2xl font-extrabold">{stats.vector_count}</p>
            <p className="text-[10px] text-slate-555 uppercase tracking-widest font-bold mt-1">Vectors Indexed</p>
          </div>

          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm text-center">
            <div className="bg-amber-100 dark:bg-amber-955/30 text-amber-600 p-3 rounded-full w-fit mx-auto mb-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="text-2xl font-extrabold">{stats.storage_usage}</p>
            <p className="text-[10px] text-slate-555 uppercase tracking-widest font-bold mt-1">Storage Usage</p>
          </div>
        </div>

        {/* Detailed stats card */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="bg-slate-100 dark:bg-slate-800 p-3.5 rounded-2xl text-slate-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Last Uploaded Knowledge Segment</p>
              <p className="text-lg font-bold text-primary truncate max-w-lg mt-1">{stats.last_uploaded_document}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
