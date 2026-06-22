// Backend API Base URL
// Can be customized via environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper to fetch authorization header
function getAuthHeader(): string {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      return `Bearer ${token}`;
    }
  }
  return '';
}

// Custom Fetch Client
async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const authHeader = getAuthHeader();
  
  const headers = new Headers(options.headers);
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}

export const apiService = {
  // Authentication API
  login: (username: string, password: string) => 
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  // Chat APIs
  sendMessage: (question: string) => 
    request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ question })
    }),
    
  getChatHistory: () => request('/api/chat-history'),

  // Notices / General Academic Info (simulated on frontend / local storage for layout integrity)
  // If not implemented on backend, we keep client-side compatibility
  getNotices: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notices');
      return Promise.resolve(stored ? JSON.parse(stored) : []);
    }
    return Promise.resolve([]);
  },
  
  createNotice: (notice: any) => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notices');
      const list = stored ? JSON.parse(stored) : [];
      const newNotice = { ...notice, id: `notice-${Date.now()}`, created_at: new Date().toISOString() };
      list.unshift(newNotice);
      localStorage.setItem('notices', JSON.stringify(list));
      return Promise.resolve(newNotice);
    }
    return Promise.resolve(notice);
  },

  deleteNotice: (noticeId: string) => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notices');
      let list = stored ? JSON.parse(stored) : [];
      list = list.filter((n: any) => n.id !== noticeId);
      localStorage.setItem('notices', JSON.stringify(list));
    }
    return Promise.resolve();
  },

  // FAQs / Question Database (simulated on frontend / local storage)
  getFAQs: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('faqs');
      return Promise.resolve(stored ? JSON.parse(stored) : [
        {
          id: 'faq-1',
          question: 'What is the minimum CGPA required for placements?',
          answer: 'Students must maintain a minimum 7.5 CGPA and have no active backlogs to be eligible for placements.',
          category: 'placement'
        },
        {
          id: 'faq-2',
          question: 'How do I borrow books from the university library?',
          answer: 'Use your Student ID Card at the library counter. Books can be checked out for up to 14 days.',
          category: 'library'
        }
      ]);
    }
    return Promise.resolve([]);
  },

  createFAQ: (faq: any) => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('faqs');
      const list = stored ? JSON.parse(stored) : [
        {
          id: 'faq-1',
          question: 'What is the minimum CGPA required for placements?',
          answer: 'Students must maintain a minimum 7.5 CGPA and have no active backlogs to be eligible for placements.',
          category: 'placement'
        },
        {
          id: 'faq-2',
          question: 'How do I borrow books from the university library?',
          answer: 'Use your Student ID Card at the library counter. Books can be checked out for up to 14 days.',
          category: 'library'
        }
      ];
      const newFaq = { ...faq, id: `faq-${Date.now()}` };
      list.unshift(newFaq);
      localStorage.setItem('faqs', JSON.stringify(list));
      return Promise.resolve(newFaq);
    }
    return Promise.resolve(faq);
  },

  deleteFAQ: (faqId: string) => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('faqs');
      let list = stored ? JSON.parse(stored) : [
        {
          id: 'faq-1',
          question: 'What is the minimum CGPA required for placements?',
          answer: 'Students must maintain a minimum 7.5 CGPA and have no active backlogs to be eligible for placements.',
          category: 'placement'
        },
        {
          id: 'faq-2',
          question: 'How do I borrow books from the university library?',
          answer: 'Use your Student ID Card at the library counter. Books can be checked out for up to 14 days.',
          category: 'library'
        }
      ];
      list = list.filter((f: any) => f.id !== faqId);
      localStorage.setItem('faqs', JSON.stringify(list));
    }
    return Promise.resolve();
  },

  // Document Database Management APIs
  uploadDocument: (file: File, title: string, category: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('uploaded_by', 'Admin');
    return request('/api/upload-document', {
      method: 'POST',
      body: formData
    });
  },
  
  uploadManualDocument: (title: string, category: string, content: string) => 
    request('/api/manual-document', {
      method: 'POST',
      body: JSON.stringify({ title, category, content })
    }),
    
  getDocuments: () => request('/api/documents'),
  
  deleteDocument: (docId: string) =>
    request(`/api/documents/${docId}`, { method: 'DELETE' }),
    
  getAnalytics: () => request('/api/knowledge-stats'),

  // Non-AI Keyword Search API
  searchDocumentsKeyword: (query: string) => 
    request(`/api/search-documents?q=${encodeURIComponent(query)}`)
};
