"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, BookOpen, Bell, HelpCircle, LogOut, Sun, Moon, 
  Upload, Trash2, Plus, BarChart2, FileText, CheckCircle, AlertCircle, Edit, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '@/services/api';

interface Document {
  id: string;
  title: string;
  filename: string;
  category: string;
  upload_date: string;
  uploaded_by: string;
}

interface Analytics {
  total_documents: number;
  total_chunks: number;
  vector_count: number;
  last_uploaded_document: string;
  storage_usage: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<'analytics' | 'upload' | 'documents' | 'notices' | 'faqs'>('analytics');
  const [darkMode, setDarkMode] = useState(true);
  const [userName, setUserName] = useState('Faculty Admin');
  
  // Data States
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    total_documents: 0,
    total_chunks: 0,
    vector_count: 0,
    last_uploaded_document: 'N/A',
    storage_usage: '0 MB'
  });
  
  // Upload and Form States
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Handbook');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Rich Text Editor States
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('Notes');
  const [manualContent, setManualContent] = useState('');
  
  // Editing states
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Notice & FAQ Forms
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeCategory, setNoticeCategory] = useState('general');
  const [notices, setNotices] = useState<any[]>([]);

  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('academic');
  const [faqs, setFaqs] = useState<any[]>([]);

  useEffect(() => {
    // Auth Check
    const storedName = localStorage.getItem('user_name');
    const storedRole = localStorage.getItem('user_role');
    const token = localStorage.getItem('access_token');
    
    if (!storedName || storedRole !== 'admin' || !token) {
      router.push('/');
    } else {
      setUserName(storedName);
    }

    loadAnalytics();
    loadDocuments();
    loadNotices();
    loadFAQs();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Data Loaders
  const loadAnalytics = async () => {
    try {
      const data = await apiService.getAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error("Failed to load analytics:", e);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await apiService.getDocuments();
      setDocuments(data);
    } catch (e) {
      console.error("Failed to load documents:", e);
    }
  };

  const loadNotices = async () => {
    try {
      const data = await apiService.getNotices();
      setNotices(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadFAQs = async () => {
    try {
      const data = await apiService.getFAQs();
      setFaqs(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Drag and Drop File Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Document Upload Submit
  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle.trim()) {
      showNotification('error', 'Please select a file and enter a title.');
      return;
    }

    setActionLoading(true);
    try {
      await apiService.uploadDocument(selectedFile, uploadTitle, uploadCategory);
      showNotification('success', 'Document uploaded and indexed successfully!');
      setSelectedFile(null);
      setUploadTitle('');
      await loadDocuments();
      await loadAnalytics();
    } catch (err: any) {
      showNotification('error', err.message || 'File upload failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Rich Text Manual Knowledge Submit
  const handleManualUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualContent.trim()) {
      showNotification('error', 'Please enter both a title and contents.');
      return;
    }

    setActionLoading(true);
    try {
      await apiService.uploadManualDocument(manualTitle, manualCategory, manualContent);
      showNotification('success', 'Manual knowledge indexed successfully!');
      setManualTitle('');
      setManualContent('');
      await loadDocuments();
      await loadAnalytics();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to submit manual knowledge.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Action
  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This will remove all its vector index records.')) return;
    
    setActionLoading(true);
    try {
      await apiService.deleteDocument(id);
      showNotification('success', 'Document deleted successfully.');
      await loadDocuments();
      await loadAnalytics();
    } catch (err: any) {
      showNotification('error', err.message || 'Deletion failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Notice Actions
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;

    try {
      await apiService.createNotice({
        title: noticeTitle,
        content: noticeContent,
        category: noticeCategory
      });
      setNoticeTitle('');
      setNoticeContent('');
      showNotification('success', 'Announcement published.');
      loadNotices();
    } catch (e) {
      showNotification('error', 'Failed to create notice.');
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await apiService.deleteNotice(id);
      loadNotices();
      showNotification('success', 'Notice deleted.');
    } catch (e) {
      showNotification('error', 'Failed to delete notice.');
    }
  };

  // FAQ Actions
  const handleCreateFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    try {
      await apiService.createFAQ({
        question: faqQuestion,
        answer: faqAnswer,
        category: faqCategory
      });
      setFaqQuestion('');
      setFaqAnswer('');
      showNotification('success', 'FAQ published.');
      loadFAQs();
    } catch (e) {
      showNotification('error', 'Failed to create FAQ.');
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    try {
      await apiService.deleteFAQ(id);
      loadFAQs();
      showNotification('success', 'FAQ deleted.');
    } catch (e) {
      showNotification('error', 'Failed to delete FAQ.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-background text-foreground transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <aside className="w-66 bg-card border-r border-border flex flex-col justify-between p-4 hidden md:flex">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="bg-primary p-2 rounded-xl text-white">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ATHENA
              </span>
              <p className="text-[9px] uppercase tracking-wider text-red-500 font-bold">Faculty Admin</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart2 className="h-4.5 w-4.5" />
              Knowledge Stats
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="h-4.5 w-4.5" />
              Upload & Input
            </button>
            <button
              onClick={() => { setActiveTab('documents'); loadDocuments(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="h-4.5 w-4.5" />
              Manage Files
            </button>
            <button
              onClick={() => { setActiveTab('notices'); loadNotices(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'notices'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bell className="h-4.5 w-4.5" />
              Manage Notices
            </button>
            <button
              onClick={() => { setActiveTab('faqs'); loadFAQs(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'faqs'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <HelpCircle className="h-4.5 w-4.5" />
              Manage FAQs
            </button>
          </nav>
        </div>

        {/* User profile & controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <div className="bg-red-100 dark:bg-red-950/30 h-9 w-9 rounded-full flex items-center justify-center text-red-500 font-bold animate-pulse">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-red-500 font-bold uppercase tracking-wider">Faculty Room</p>
              <p className="text-sm font-semibold truncate leading-4">{userName}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex-1 flex justify-center py-2 border border-border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-xs"
            >
              {darkMode ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex justify-center py-2 border border-red-200 dark:border-red-950 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer text-xs"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Toast Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 z-50 text-white font-medium text-sm ${
                notification.type === 'success' ? 'bg-green-600 shadow-green-500/10' : 'bg-red-600 shadow-red-500/10'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle className="h-4.5 w-4.5" /> : <AlertCircle className="h-4.5 w-4.5" />}
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab display */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* TAB 1: Knowledge stats */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">RAG Knowledge Management</h1>
                <p className="text-sm text-slate-500 mt-1">Real-time stats from local PostgreSQL relational metadata and ChromaDB vector collections.</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="bg-primary/10 text-primary p-3 rounded-xl shrink-0"><FileText className="h-6 w-6" /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Documents</p>
                    <p className="text-2xl font-bold mt-0.5">{analytics.total_documents}</p>
                  </div>
                </div>
                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="bg-purple-100 dark:bg-purple-950/30 text-purple-600 p-3 rounded-xl shrink-0"><BarChart2 className="h-6 w-6" /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Total Chunks</p>
                    <p className="text-2xl font-bold mt-0.5">{analytics.total_chunks}</p>
                  </div>
                </div>
                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="bg-green-100 dark:bg-green-950/30 text-green-600 p-3 rounded-xl shrink-0"><CheckCircle className="h-6 w-6" /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Vector Count</p>
                    <p className="text-2xl font-bold mt-0.5">{analytics.vector_count}</p>
                  </div>
                </div>
                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="bg-amber-100 dark:bg-amber-950/30 text-amber-600 p-3 rounded-xl shrink-0"><Upload className="h-6 w-6" /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Storage Size</p>
                    <p className="text-2xl font-bold mt-0.5">{analytics.storage_usage}</p>
                  </div>
                </div>
              </div>

              {/* Extra Details */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm max-w-xl">
                <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-2">Last Uploaded Document</h3>
                <p className="text-lg font-bold text-primary truncate">{analytics.last_uploaded_document}</p>
              </div>
            </div>
          )}

          {/* TAB 2: Upload Files & Rich Text Editor */}
          {activeTab === 'upload' && (
            <div className="grid md:grid-cols-2 gap-6 max-w-6xl">
              
              {/* Left Side: Drag and Drop Files */}
              <div className="space-y-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
                <div>
                  <h3 className="font-bold text-lg">Upload Files</h3>
                  <p className="text-xs text-slate-500 mt-1">Upload PDF, DOCX, or TXT. Pages will be parsed and segmented automatically.</p>
                </div>
                
                <form onSubmit={handleDocUpload} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Knowledge Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Operating Systems Scheduling Guide"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none text-sm"
                    >
                      <option value="Handbook">Handbook</option>
                      <option value="Calendar">Calendar</option>
                      <option value="Placement">Placement</option>
                      <option value="Notes">Notes</option>
                      <option value="Rules">Rules</option>
                    </select>
                  </div>

                  {/* Drag Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all relative ${
                      dragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-slate-50/10'
                    }`}
                  >
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.docx,.doc,.txt,.md"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-10 w-10 mx-auto text-primary mb-3" />
                    {selectedFile ? (
                      <div>
                        <p className="text-sm font-bold text-primary truncate max-w-xs mx-auto">{selectedFile.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold">Click or Drag PDF / DOCX / TXT file here</p>
                        <p className="text-xs text-slate-400 mt-1">Maximum size limit 10MB</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading || !selectedFile}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'Segmenting & Embedding Vectors...' : 'Upload & Index File'}
                  </button>
                </form>
              </div>

              {/* Right Side: Rich Text Knowledge Input */}
              <div className="space-y-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
                <div>
                  <h3 className="font-bold text-lg">Input Manual Knowledge</h3>
                  <p className="text-xs text-slate-500 mt-1">Write or paste text knowledge content directly via editor.</p>
                </div>
                
                <form onSubmit={handleManualUpload} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Knowledge Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Specific Exam Fee FAQ"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Category</label>
                    <select
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none text-sm"
                    >
                      <option value="Handbook">Handbook</option>
                      <option value="Calendar">Calendar</option>
                      <option value="Placement">Placement</option>
                      <option value="Notes">Notes</option>
                      <option value="Rules">Rules</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Content Details (Plain/Markdown Text)</label>
                    <textarea
                      required
                      rows={6}
                      placeholder="Type or paste the complete academic details here..."
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-primary/20 cursor-pointer"
                  >
                    {actionLoading ? 'Generating Embeddings...' : 'Submit Knowledge'}
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 3: Manage Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-6 max-w-5xl bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border font-bold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Indexed Knowledge Documents Database
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-border">
                      <th className="p-4">Title</th>
                      <th className="p-4">Filename</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Upload Date</th>
                      <th className="p-4">Uploaded By</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documents.length > 0 ? (
                      documents.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50/10 transition-all">
                          <td className="p-4 font-bold">{doc.title}</td>
                          <td className="p-4 text-slate-500 font-mono text-xs">{doc.filename}</td>
                          <td className="p-4">
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {doc.category}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-450">{new Date(doc.upload_date).toLocaleDateString()}</td>
                          <td className="p-4 text-xs text-slate-500">{doc.uploaded_by}</td>
                          <td className="p-4 flex gap-2 justify-center">
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="p-2 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                              title="Delete document and its vector chunks"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">No documents found. Go to 'Upload & Input' to load knowledge!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Manage Notices */}
          {activeTab === 'notices' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Manage Notice Board</h1>
                <p className="text-sm text-slate-500 mt-1">Publish alerts and announcements on the student board.</p>
              </div>

              {/* Form */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <form onSubmit={handleCreateNotice} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Notice Title</label>
                      <input
                        type="text"
                        required
                        value={noticeTitle}
                        onChange={(e) => setNoticeTitle(e.target.value)}
                        placeholder="e.g. Fees Payment Deadline Extended"
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Category</label>
                      <select
                        value={noticeCategory}
                        onChange={(e) => setNoticeCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none text-sm"
                      >
                        <option value="general">General</option>
                        <option value="exam">Exam</option>
                        <option value="placement">Placement</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Announcements Content</label>
                    <textarea
                      required
                      rows={3}
                      value={noticeContent}
                      onChange={(e) => setNoticeContent(e.target.value)}
                      placeholder="Type details..."
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/95 text-white font-semibold py-2 px-6 rounded-xl cursor-pointer"
                  >
                    Publish Announcement
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="space-y-4">
                {notices.map(n => (
                  <div key={n.id} className="bg-card border border-border p-5 rounded-2xl flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-bold">{n.title}</h4>
                      <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{n.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteNotice(n.id)}
                      className="p-1.5 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Manage FAQs */}
          {activeTab === 'faqs' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Manage FAQs Panel</h1>
                <p className="text-sm text-slate-500 mt-1">Publish standard question-answers for student views.</p>
              </div>

              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <form onSubmit={handleCreateFAQ} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Question</label>
                      <input
                        type="text"
                        required
                        value={faqQuestion}
                        onChange={(e) => setFaqQuestion(e.target.value)}
                        placeholder="e.g. Where is the controller of exams office?"
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Category</label>
                      <input
                        type="text"
                        required
                        value={faqCategory}
                        onChange={(e) => setFaqCategory(e.target.value)}
                        placeholder="e.g. Academic, General"
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Answer</label>
                    <textarea
                      required
                      rows={2}
                      value={faqAnswer}
                      onChange={(e) => setFaqAnswer(e.target.value)}
                      placeholder="Type answer..."
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/95 text-white font-semibold py-2 px-6 rounded-xl cursor-pointer"
                  >
                    Publish FAQ
                  </button>
                </form>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {faqs.map(f => (
                  <div key={f.id} className="bg-card border border-border p-5 rounded-2xl flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-bold text-primary flex gap-2 items-start">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 mt-0.5">Q</span>
                        {f.question}
                      </h4>
                      <p className="text-sm text-slate-500 mt-2 pl-7">{f.answer}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteFAQ(f.id)}
                      className="p-1.5 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
