"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, Bell, HelpCircle, BookOpen, LogOut, Sun, Moon, 
  Send, Search, Sparkles, User, RefreshCw, Paperclip, AlertCircle, FileText,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '@/services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ document: string; page: string }>;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface Document {
  id: string;
  title: string;
  filename: string;
  category: string;
  upload_date: string;
}

interface SearchResult {
  document_id: string;
  title: string;
  filename: string;
  category: string;
  chunk_index: number;
  text: string;
  page_number: number | null;
}

export default function Dashboard() {
  const router = useRouter();
  
  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<'chat' | 'search-files' | 'notices' | 'faqs' | 'materials'>('chat');
  const [darkMode, setDarkMode] = useState(true);
  const [userName, setUserName] = useState('Student');
  const [userEmail, setUserEmail] = useState('');
  
  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Data States
  const [notices, setNotices] = useState<Notice[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  
  // Non-AI Keyword Search States
  const [keywordQuery, setKeywordQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    // Auth Check
    const storedName = localStorage.getItem('user_name');
    const storedEmail = localStorage.getItem('user_email');
    const token = localStorage.getItem('access_token');
    
    if (!storedName || !token) {
      router.push('/');
    } else {
      setUserName(storedName);
      setUserEmail(storedEmail || '');
    }

    // Load Chat History & Data
    loadChatHistory();
    loadNotices();
    loadFAQs();
    loadDocuments();
  }, []);

  useEffect(() => {
    // Theme sync
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // API Data Loaders
  const loadChatHistory = async () => {
    try {
      setChatLoading(true);
      const history = await apiService.getChatHistory();
      
      const formatted: Message[] = [];
      if (history.length === 0) {
        formatted.push({
          role: 'assistant',
          content: "Hello! I am your AI Academic Assistant. Ask me anything about exam schedules, library timings, placements, or academic notes (OS and DSA). I will search our verified college database first.",
          sources: []
        });
      } else {
        history.forEach((h: any) => {
          formatted.push({ role: 'user', content: h.question });
          formatted.push({ role: 'assistant', content: h.answer, sources: h.sources });
        });
      }
      setMessages(formatted);
    } catch (e) {
      console.error("Failed to load chat history:", e);
    } finally {
      setChatLoading(false);
    }
  };

  const loadNotices = async () => {
    try {
      setDataLoading(true);
      const data = await apiService.getNotices();
      setNotices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
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

  const loadDocuments = async () => {
    try {
      const data = await apiService.getDocuments();
      setDocuments(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Chat Actions
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputMessage;
    if (!textToSend.trim()) return;

    const userMsg: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setChatLoading(true);

    try {
      // POST to /api/chat
      const res = await apiService.sendMessage(textToSend);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.answer,
        sources: res.sources
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an issue processing your query. Please make sure the backend server is running and database tables are online.",
        sources: []
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Non-AI Keyword Search Action
  const handleKeywordSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywordQuery.trim()) return;

    setSearchLoading(true);
    try {
      const results = await apiService.searchDocumentsKeyword(keywordQuery);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const startNewChat = () => {
    // Delete session simulated by clearing history or logging out/resetting
    setMessages([
      {
        role: 'assistant',
        content: "New session started. Ask me questions grounded in your college documentation.",
        sources: []
      }
    ]);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  // Filter notice board views locally
  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-background text-foreground transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <aside className="w-66 bg-card border-r border-border flex flex-col justify-between p-4 hidden md:flex">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="bg-primary p-2 rounded-xl text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ATHENA
              </span>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Student Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="h-4.5 w-4.5" />
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('search-files')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'search-files'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Search className="h-4.5 w-4.5" />
              Search Files (Non-AI)
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
              Notices
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
              FAQs
            </button>
            <button
              onClick={() => { setActiveTab('materials'); loadDocuments(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'materials'
                  ? 'bg-primary text-white shadow-lg shadow-primary/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="h-4.5 w-4.5" />
              Reference Materials
            </button>
          </nav>
        </div>

        {/* User Profile */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <div className="bg-slate-200 dark:bg-slate-800 h-9 w-9 rounded-full flex items-center justify-center text-primary font-bold">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-4">{userName}</p>
              <p className="text-[10px] text-slate-500 truncate">{userEmail}</p>
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Header */}
        <header className="bg-card border-b border-border p-4 flex justify-between items-center md:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Athena Hub</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 border border-border rounded-lg"
            >
              {darkMode ? <Sun className="h-4.5 w-4.5 text-yellow-400" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 border border-red-200 text-red-500 rounded-lg"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* Mobile Tab Selectors */}
        <div className="grid grid-cols-5 p-1 bg-card border-b border-border md:hidden overflow-x-auto">
          <button onClick={() => setActiveTab('chat')} className={`py-2 text-[10px] font-semibold text-center ${activeTab === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}>AI Chat</button>
          <button onClick={() => setActiveTab('search-files')} className={`py-2 text-[10px] font-semibold text-center ${activeTab === 'search-files' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}>Search</button>
          <button onClick={() => { setActiveTab('notices'); loadNotices(); }} className={`py-2 text-[10px] font-semibold text-center ${activeTab === 'notices' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}>Notices</button>
          <button onClick={() => { setActiveTab('faqs'); loadFAQs(); }} className={`py-2 text-[10px] font-semibold text-center ${activeTab === 'faqs' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}>FAQs</button>
          <button onClick={() => { setActiveTab('materials'); loadDocuments(); }} className={`py-2 text-[10px] font-semibold text-center ${activeTab === 'materials' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}>Files</button>
        </div>

        {/* Tab Display Area */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          
          {/* TAB 1: Chat Hub */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-background/20">
              
              <div className="bg-card border-b border-border p-4 flex justify-between items-center shadow-sm">
                <div>
                  <h2 className="font-bold flex items-center gap-2">
                    Athena AI Academic Assistant
                    <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">Postgres RAG</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Prioritizes uploaded college documents. Will not hallucinate rules.</p>
                </div>
                <button
                  onClick={startNewChat}
                  className="bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  Clear Session
                </button>
              </div>

              {/* Chat bubbles container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        msg.role === 'user' 
                          ? 'bg-primary text-white' 
                          : 'bg-card border border-border shadow-sm text-primary'
                      }`}>
                        {msg.role === 'user' ? 'U' : <Sparkles className="h-4 w-4" />}
                      </div>

                      <div className="space-y-1">
                        <div className={`p-4 rounded-2xl shadow-sm text-sm border ${
                          msg.role === 'user'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-card border-border text-foreground'
                        }`}>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        
                        {/* Page citations */}
                        {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                          <div className="flex items-center gap-2 px-1 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Sources:</span>
                            {msg.sources.map((src, i) => (
                              <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 border border-border text-slate-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Paperclip className="h-2.5 w-2.5 text-primary" />
                                <span className="font-semibold">{src.document}</span> 
                                <span className="text-slate-400 font-normal">({src.page})</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-3 max-w-3xl">
                      <div className="h-8 w-8 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-primary">
                        <Sparkles className="h-4 w-4 animate-spin" />
                      </div>
                      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                        <div className="flex gap-1.5 items-center justify-center py-1">
                          <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                          <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </AnimatePresence>
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 bg-card border-t border-border shadow-md">
                <div className="max-w-3xl mx-auto flex gap-3 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask a question grounded in college handbook or notes..."
                    className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary px-4 py-3.5 pr-12 rounded-xl text-sm shadow-inner"
                  />
                  <button
                    type="submit"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/95 text-white p-2 rounded-lg transition-all shadow-md shadow-primary/20 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Non-AI Keyword Search */}
          {activeTab === 'search-files' && (
            <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Keyword Document Search</h1>
                <p className="text-sm text-slate-500 mt-1">Queries text segments inside database documents without using LLM embeddings (Direct SQL matching).</p>
              </div>

              {/* Search Form */}
              <form onSubmit={handleKeywordSearch} className="max-w-xl flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    placeholder="Enter keywords (e.g. attendance, condonation, quantum)..."
                    value={keywordQuery}
                    onChange={(e) => setKeywordQuery(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                </div>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/95 text-white font-semibold px-6 rounded-xl text-sm cursor-pointer shadow-md shadow-primary/10"
                >
                  Search
                </button>
              </form>

              {/* Results */}
              {searchLoading ? (
                <div className="py-20 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4 max-w-4xl">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{searchResults.length} segments matched</p>
                  {searchResults.map((res, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-card border border-border p-5 rounded-2xl shadow-sm relative overflow-hidden"
                    >
                      <div className="flex justify-between items-center mb-2.5">
                        <div className="flex gap-2 items-center">
                          <FileText className="h-4.5 w-4.5 text-primary" />
                          <span className="font-bold text-sm truncate max-w-xs">{res.title}</span>
                          <span className="text-[10px] text-slate-450 uppercase font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {res.category}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 font-semibold">
                          Page {res.page_number || 'N/A'} (Segment {res.chunk_index})
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed border-l-2 border-primary/20 pl-3">
                        {res.text}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : keywordQuery && (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl max-w-xl">
                  <AlertCircle className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-slate-500 text-sm font-semibold">No direct text matches found.</p>
                  <p className="text-xs text-slate-400 mt-1">Try another keyword term or consult the AI Assistant.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Notices */}
          {activeTab === 'notices' && (
            <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Notice Board</h1>
                  <p className="text-sm text-slate-500 mt-1">Official circulars, alerts, and calendar notifications.</p>
                </div>
                
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Filter notices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {filteredNotices.length > 0 ? (
                <div className="grid gap-4 max-w-4xl">
                  {filteredNotices.map(notice => (
                    <motion.div
                      key={notice.id}
                      className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden"
                    >
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                        notice.category === 'exam' ? 'bg-red-500' :
                        notice.category === 'placement' ? 'bg-green-500' : 'bg-primary'
                      }`} />

                      <div className="flex justify-between items-start gap-4 mb-2 pl-2">
                        <h3 className="font-bold text-lg">{notice.title}</h3>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          notice.category === 'exam' ? 'bg-red-500/10 text-red-500' :
                          notice.category === 'placement' ? 'bg-green-500/10 text-green-500' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {notice.category}
                        </span>
                      </div>
                      
                      <p className="text-slate-650 dark:text-slate-350 text-sm leading-relaxed mb-4 pl-2 whitespace-pre-line">
                        {notice.content}
                      </p>
                      
                      <div className="text-[10px] text-slate-400 pl-2">
                        Published: {new Date(notice.created_at).toLocaleDateString()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl max-w-xl">
                  <p className="text-slate-500 text-sm">No announcements published.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FAQs */}
          {activeTab === 'faqs' && (
            <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h1>
                <p className="text-sm text-slate-500 mt-1">Official regulations and administrative inquiries.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 max-w-5xl">
                {faqs.map(faq => (
                  <div key={faq.id} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-base mb-2 flex gap-2 items-start text-primary">
                      <span className="bg-primary/10 text-primary rounded-lg text-xs font-bold px-2 py-0.5 mt-0.5">Q</span>
                      {faq.question}
                    </h3>
                    <p className="text-slate-650 dark:text-slate-400 text-sm leading-relaxed pl-7">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Reference Materials */}
          {activeTab === 'materials' && (
            <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Grounded Knowledge Documents</h1>
                <p className="text-sm text-slate-500 mt-1">Official files currently loaded in the ChromaDB vector database for RAG context extraction.</p>
              </div>

              {documents.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 max-w-5xl">
                  {documents.map(doc => (
                    <motion.div
                      key={doc.id}
                      className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-primary/10 text-primary p-2.5 rounded-xl shrink-0">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate pr-2">{doc.title}</p>
                          <span className="text-[10px] text-green-500 font-bold uppercase">Indexed for RAG</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleSendMessage(undefined, `Summarize the document ${doc.filename}`)}
                        className="text-[11px] bg-primary text-white font-semibold py-1.5 px-3 rounded-lg cursor-pointer hover:bg-primary/95 transition-all shadow-sm shadow-primary/10"
                      >
                        Query
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-2xl max-w-xl">
                  <BookOpen className="h-10 w-10 mx-auto text-slate-350 mb-3" />
                  <p className="text-slate-500 text-sm font-semibold">No materials uploaded.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
