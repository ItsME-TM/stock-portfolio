import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Coins, 
  Briefcase, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw, 
  SlidersHorizontal,
  FolderTree,
  Activity,
  Layers,
  ArrowUpDown,
  Lock,
  User,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

const SECTOR_COLORS = [
  '#cc5a37', // Claude Clay / Orange-Red
  '#3b82f6', // Bright Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Orange
  '#8b5cf6', // Violet Purple
  '#14b8a6', // Teal
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#6b7280'  // Slate Gray
];

const AVAILABLE_SECTORS = [
  'Technology',
  'Financials',
  'Healthcare',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Energy',
  'Utilities',
  'Real Estate',
  'Industrials',
  'Materials',
  'Communication Services',
  'Other'
];

// Dynamically return soft, colorful badge tailwind classes based on stock sector
const getSectorBadgeClass = (sector) => {
  switch (sector) {
    case 'Technology': 
      return 'bg-blue-50 border border-blue-200 text-blue-700';
    case 'Financials': 
      return 'bg-emerald-50 border border-emerald-200 text-emerald-700';
    case 'Healthcare': 
      return 'bg-teal-50 border border-teal-200 text-teal-700';
    case 'Consumer Cyclical': 
      return 'bg-purple-50 border border-purple-200 text-purple-700';
    case 'Consumer Defensive': 
      return 'bg-pink-50 border border-pink-200 text-pink-700';
    case 'Energy': 
      return 'bg-amber-50 border border-amber-200 text-amber-700';
    case 'Utilities': 
      return 'bg-cyan-50 border border-cyan-200 text-cyan-700';
    case 'Real Estate': 
      return 'bg-indigo-50 border border-indigo-200 text-indigo-700';
    case 'Industrials': 
      return 'bg-orange-50 border border-orange-200 text-orange-700';
    case 'Materials': 
      return 'bg-red-50 border border-red-200 text-red-700';
    case 'Communication Services': 
      return 'bg-violet-50 border border-violet-200 text-violet-700';
    default: 
      return 'bg-slate-100 border border-slate-200 text-slate-600';
  }
};

export default function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('stellarvest_token') || '');
  const [username, setUsername] = useState(localStorage.getItem('stellarvest_username') || '');
  const [isRegistered, setIsRegistered] = useState(true); // default true, checked on mount
  const [authLoading, setAuthLoading] = useState(true);
  
  // Auth Form Input State
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Portfolio Dashboard State
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState({
    totalInvestment: 0,
    totalStocks: 0,
    sectorDistribution: [],
    topStocks: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [selectedSector, setSelectedSector] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('symbol'); // symbol, cost, quantity
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, portfolio, backup

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);

  // Form State
  const [formSymbol, setFormSymbol] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formTotalInvested, setFormTotalInvested] = useState('');
  const [formSector, setFormSector] = useState('Other');
  const [formStatus, setFormStatus] = useState('Neutral');

  // Import State
  const [importStatus, setImportStatus] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Notifications
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, selectedSector]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Check if any admin account is registered in DB
  const checkAuthStatus = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        setIsRegistered(data.registered);
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Perform Admin Register (Setup account)
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authUsername || !authPassword) {
      setAuthError('Please fill in all fields');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      showNotification('Admin account registered successfully!');
      setIsRegistered(true);
      // Reset inputs to allow login
      setAuthPassword('');
      setAuthConfirmPassword('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Perform Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authUsername || !authPassword) {
      setAuthError('Please enter username and password');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      // Store token & username
      localStorage.setItem('stellarvest_token', data.token);
      localStorage.setItem('stellarvest_username', data.username);
      setToken(data.token);
      setUsername(data.username);
      
      showNotification(`Welcome back, ${data.username}!`);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Perform Logout
  const handleLogout = () => {
    localStorage.removeItem('stellarvest_token');
    localStorage.removeItem('stellarvest_username');
    setToken('');
    setUsername('');
    setStocks([]);
    setSummary({
      totalInvestment: 0,
      totalStocks: 0,
      sectorDistribution: [],
      topStocks: []
    });
    // Check registry status again
    checkAuthStatus();
    showNotification('Signed out successfully.');
  };

  // Fetch stocks and dashboard summary with Bearer Authorization
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 
        'Authorization': `Bearer ${token}` 
      };

      // Fetch Stocks
      let stocksUrl = '/api/stocks';
      if (selectedSector) {
        stocksUrl += `?sector=${encodeURIComponent(selectedSector)}`;
      }
      
      const stocksRes = await fetch(stocksUrl, { headers });
      
      // Auto logout on unauthorized response
      if (stocksRes.status === 401 || stocksRes.status === 403) {
        handleLogout();
        return;
      }
      if (!stocksRes.ok) throw new Error('Failed to load stocks list');
      const stocksData = await stocksRes.json();
      setStocks(stocksData);

      // Fetch Summary Stats
      const summaryRes = await fetch('/api/summary', { headers });
      if (!summaryRes.ok) throw new Error('Failed to load portfolio summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);
      
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Triggered when opening modal for adding or editing
  const openModal = (stock = null) => {
    if (stock) {
      setEditingStock(stock);
      setFormSymbol(stock.symbol);
      setFormQuantity(stock.quantity);
      setFormTotalInvested(stock.total_invested);
      setFormSector(stock.sector || 'Other');
      setFormStatus(stock.status || 'Neutral');
    } else {
      setEditingStock(null);
      setFormSymbol('');
      setFormQuantity('');
      setFormTotalInvested('');
      setFormSector('Other');
      setFormStatus('Neutral');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStock(null);
  };

  // Submit Add / Edit Stock Form
  const handleSubmitStock = async (e) => {
    e.preventDefault();
    if (!formSymbol || !formQuantity || !formTotalInvested) {
      showNotification('Please fill in all required fields.', 'error');
      return;
    }

    const payload = {
      symbol: formSymbol.trim().toUpperCase(),
      quantity: parseInt(formQuantity, 10),
      total_invested: parseFloat(formTotalInvested),
      sector: formSector,
      status: formStatus
    };

    try {
      let url = '/api/stocks';
      let method = 'POST';

      if (editingStock) {
        url = `/api/stocks/${editingStock.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save stock');
      }

      showNotification(
        editingStock 
          ? `Stock "${payload.symbol}" updated successfully` 
          : `Stock "${payload.symbol}" added successfully`
      );
      closeModal();
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Delete Stock
  const handleDeleteStock = async (id, symbol) => {
    if (!confirm(`Are you sure you want to remove ${symbol} from your portfolio?`)) return;

    try {
      const res = await fetch(`/api/stocks/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error('Failed to delete stock');
      
      showNotification(`Removed ${symbol} from portfolio`);
      fetchData();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // CSV Export Action
  const handleExportCSV = () => {
    // Download via token query param or fetch. For simple download we fetch it
    fetch('/api/export', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      return res.blob();
    })
    .then(blob => {
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'portfolio_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showNotification('Exported stock database to CSV');
    })
    .catch(err => showNotification('Export failed: ' + err.message, 'error'));
  };

  // CSV Import Action
  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import CSV');

      setImportStatus({ type: 'success', message: data.message });
      showNotification('CSV imported successfully!');
      fetchData();
    } catch (err) {
      setImportStatus({ type: 'error', message: err.message });
      showNotification('Import failed: ' + err.message, 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filter and Sort local stocks state
  const getFilteredAndSortedStocks = () => {
    let result = [...stocks];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(s => s.symbol.toLowerCase().includes(query) || s.sector.toLowerCase().includes(query));
    }

    // Sort
    result.sort((a, b) => {
      let fieldA, fieldB;
      if (sortBy === 'symbol') {
        fieldA = a.symbol;
        fieldB = b.symbol;
      } else if (sortBy === 'cost') {
        fieldA = parseFloat(a.total_invested);
        fieldB = parseFloat(b.total_invested);
      } else if (sortBy === 'quantity') {
        fieldA = parseInt(a.quantity, 10);
        fieldB = parseInt(b.quantity, 10);
      }

      if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formattedStocks = getFilteredAndSortedStocks();

  // Helper formatting values (Sri Lankan Rupees)
  const formatCurrency = (val) => {
    return 'Rs. ' + new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  // ----------------------------------------------------
  // AUTHENTICATION LAYOUT (Register/Login Screen)
  // ----------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#faf8f5] px-4 py-16 selection:bg-[#cc5a37] selection:text-white">
        <div className="w-full max-w-md claude-card bg-white border border-[#e9e4db] p-8 flex flex-col gap-6 animate-in fade-in duration-300">
          
          {/* Header logo/label */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="p-3 bg-[#cc5a37]/10 text-[#cc5a37] rounded-2xl border border-[#cc5a37]/20 shadow-sm w-fit">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">StellarVest</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">Sri Lankan Stock Portfolio Tracker</p>
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Form */}
          {authLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <RefreshCw className="w-8 h-8 text-[#cc5a37] animate-spin" />
              <span className="text-xs text-slate-400 font-medium">Communicating with security module...</span>
            </div>
          )}

          {!authLoading && (
            <form 
              onSubmit={isRegistered ? handleLogin : handleRegister} 
              className="flex flex-col gap-4"
            >
              <div className="text-center mb-2">
                <h2 className="text-sm font-bold text-slate-800">
                  {isRegistered ? 'Sign In to Workspace' : 'Initialize Admin Credentials'}
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isRegistered 
                    ? 'Authentication required to manage database resources.' 
                    : 'No administrator set up. Configure your credentials now.'}
                </p>
              </div>

              {authError && (
                <div className="p-3.5 bg-rose-50 border border-rose-250 text-rose-800 rounded-xl flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-semibold leading-relaxed">{authError}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Enter admin username"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#cc5a37] transition text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Enter secure password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#cc5a37] transition text-sm"
                  />
                </div>
              </div>

              {/* Confirm Password (only for register) */}
              {!isRegistered && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-450">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Confirm secure password"
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#cc5a37] transition text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                className="w-full py-3 bg-[#cc5a37] hover:bg-[#b84e2e] text-white rounded-xl font-bold text-sm tracking-wide transition shadow-sm mt-2"
              >
                {isRegistered ? 'Access Workspace' : 'Initialize Workspace'}
              </button>
            </form>
          )}

          {/* Secure lock notice */}
          <div className="text-[10px] text-slate-400 text-center leading-relaxed font-semibold">
            🔐 Session transmission is encrypted. Access parameters are restricted on-prem.
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN PORTFOLIO APPLICATION (Authenticated view)
  // ----------------------------------------------------
  return (
    <div className="min-h-full flex flex-col bg-[#faf8f5] text-[#191919] selection:bg-[#cc5a37] selection:text-white pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border transition-all duration-300 shadow-xl ${
          notification.type === 'error' 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        } backdrop-blur-md`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#e9e4db] claude-header-glass py-3 px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        {/* Mobile Row 1: Logo (Left) + User Profile / Logout (Right) */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#cc5a37]/10 text-[#cc5a37] rounded-lg border border-[#cc5a37]/20 shadow-sm">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">StellarVest</h1>
              <p className="hidden md:block text-xs text-slate-500 font-medium mt-0.5">Sri Lankan Stock Portfolio Tracker</p>
            </div>
          </div>
          
          {/* Mobile Profile & Logout Controls */}
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-750">{username}</span>
              <span className="text-[8px] text-emerald-650 font-bold uppercase tracking-wider">Active</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600 rounded-lg transition shadow-sm"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Mobile Row 2: Centered Navigation Tabs */}
        <div className="flex items-center justify-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 flex-shrink-0 ${
              activeTab === 'dashboard' 
                ? 'bg-[#cc5a37] text-white shadow-sm' 
                : 'text-slate-650 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('portfolio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 flex-shrink-0 ${
              activeTab === 'portfolio' 
                ? 'bg-[#cc5a37] text-white shadow-sm' 
                : 'text-slate-650 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            My Portfolio
          </button>
          <button 
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-200 flex-shrink-0 ${
              activeTab === 'backup' 
                ? 'bg-[#cc5a37] text-white shadow-sm' 
                : 'text-slate-650 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Backup & Restore
          </button>
        </div>

        {/* Desktop Profile & Logout (Hidden on mobile) */}
        <div className="hidden md:flex items-center justify-end gap-3 w-full md:w-auto">
          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-slate-700 leading-tight">{username}</span>
            <span className="text-[9px] text-emerald-600 font-bold tracking-wide uppercase mt-0.5">Active Session</span>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600 rounded-xl transition shadow-sm"
            title="Sign Out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8 flex-1 flex flex-col gap-8">
        
        {/* Top Aggregation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="claude-card p-6 flex items-center justify-between relative overflow-hidden group hover:border-[#cc5a37]/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#cc5a37]/3 rounded-full blur-3xl group-hover:bg-[#cc5a37]/5 transition-all duration-300"></div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Investment</span>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {loading ? <RefreshCw className="w-6 h-6 animate-spin text-[#cc5a37]" /> : formatCurrency(summary.totalInvestment)}
              </span>
            </div>
            <div className="p-3 bg-[#cc5a37]/10 border border-[#cc5a37]/20 text-[#cc5a37] rounded-xl shadow-sm">
              <Coins className="w-6 h-6" />
            </div>
          </div>

          <div className="claude-card p-6 flex items-center justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/3 rounded-full blur-3xl group-hover:bg-blue-500/5 transition-all duration-300"></div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Holdings</span>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {loading ? <RefreshCw className="w-6 h-6 animate-spin text-blue-500" /> : summary.totalStocks}
              </span>
            </div>
            <div className="p-3 bg-blue-50/85 border border-blue-200 text-blue-600 rounded-xl shadow-sm">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>

          <div className="claude-card p-6 flex items-center justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/3 rounded-full blur-3xl group-hover:bg-emerald-500/5 transition-all duration-300"></div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Active Sectors</span>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {loading ? <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" /> : summary.sectorDistribution.length}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/85 border border-emerald-200 text-emerald-600 rounded-xl shadow-sm">
              <FolderTree className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Global Loading Spinner / Error message */}
        {loading && stocks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-12 h-12 text-[#cc5a37] animate-spin" />
            <p className="text-slate-500 text-sm font-medium">Fetching live portfolio insights...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <div className="text-sm font-semibold">{error}</div>
            <button onClick={fetchData} className="ml-auto px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 rounded-lg text-xs font-bold transition-all">
              Retry
            </button>
          </div>
        )}

        {/* TAB 1: DASHBOARD VIEW */}
        {!loading && activeTab === 'dashboard' && (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Sector Allocations Chart */}
              <div className="claude-card p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-slate-650" />
                    <h2 className="text-lg font-bold text-slate-900">Sector Allocation</h2>
                  </div>
                  <span className="text-xs bg-[#cc5a37]/10 border border-[#cc5a37]/20 text-[#cc5a37] font-bold px-2.5 py-1 rounded-full">
                    By Total Invested
                  </span>
                </div>
                
                <div className="h-80 w-full flex items-center justify-center relative">
                  {summary.sectorDistribution.length === 0 ? (
                    <span className="text-slate-400 text-sm font-medium">No data available. Add stock records to view charts.</span>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary.sectorDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {summary.sectorDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)} 
                          contentStyle={{ background: '#ffffff', border: '1px solid #e9e4db', borderRadius: '12px', color: '#191919' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {summary.sectorDistribution.length > 0 && (
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Invested</span>
                      <span className="text-lg font-extrabold text-slate-900">{formatCurrency(summary.totalInvestment)}</span>
                    </div>
                  )}
                </div>

                {/* Sector Legend */}
                {summary.sectorDistribution.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-xs font-bold">
                    {summary.sectorDistribution.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-2 text-slate-700">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }}></span>
                        <span className="truncate max-w-[85px]" title={item.name}>{item.name}</span>
                        <span className="text-slate-550 font-normal ml-auto">({((item.value / summary.totalInvestment) * 100).toFixed(0)}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Investments Bar Chart */}
              <div className="claude-card p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-5 h-5 text-slate-650" />
                    <h2 className="text-lg font-bold text-slate-900">Top 5 Holdings</h2>
                  </div>
                  <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 font-bold px-2.5 py-1 rounded-full">
                    Highest Investment
                  </span>
                </div>
                
                <div className="h-80 w-full flex items-center justify-center">
                  {summary.topStocks.length === 0 ? (
                    <span className="text-slate-400 text-sm font-medium">No data available. Add stock records to view charts.</span>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.topStocks} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)} 
                          contentStyle={{ background: '#ffffff', border: '1px solid #e9e4db', borderRadius: '12px', color: '#191919' }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {summary.topStocks.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#cc5a37" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="claude-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-950">Manage Portfolio Records</h3>
                <p className="text-sm text-slate-500">Perform direct CRUD operations or export database details</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => openModal()}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-[#cc5a37] hover:bg-[#b84e2e] text-white rounded-xl font-bold text-xs tracking-wide shadow-sm hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add New Stock
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  Backup (CSV)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PORTFOLIO LIST VIEW */}
        {!loading && activeTab === 'portfolio' && (
          <div className="flex flex-col gap-6">
            
            {/* Filter, Search & Add Bar */}
            <div className="claude-card p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              
              {/* Left search & filter */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search stocks by symbol or sector..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#cc5a37] transition text-sm"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-650"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sector filter */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Filter className="w-4 h-4" />
                  </span>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:border-[#cc5a37] transition text-sm appearance-none cursor-pointer w-full sm:w-56"
                  >
                    <option value="">All Sectors</option>
                    {AVAILABLE_SECTORS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right: Add stock button */}
              <button 
                onClick={() => openModal()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#cc5a37] hover:bg-[#b84e2e] text-white rounded-xl font-bold text-xs tracking-wide shadow-sm hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                Add Stock
              </button>
            </div>

            {/* List / Table Content */}
            {formattedStocks.length === 0 ? (
              <div className="claude-card p-16 flex flex-col items-center justify-center text-center border-dashed border-slate-200">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 mb-4">
                  <SlidersHorizontal className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">No stock assets found</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  {searchQuery || selectedSector 
                    ? "Try adjusting your search criteria or resetting the filters to show all assets."
                    : "Your investment portfolio is currently empty. Get started by manual entries or restore an export CSV."}
                </p>
                {(searchQuery || selectedSector) && (
                  <button 
                    onClick={() => { setSelectedSector(''); setSearchQuery(''); }}
                    className="mt-4 px-4 py-2 bg-[#cc5a37]/10 border border-[#cc5a37]/25 text-[#cc5a37] text-xs font-bold rounded-lg hover:bg-[#cc5a37]/20 transition-all"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* Desktop Table View (visible on medium and larger screens) */}
                <div className="hidden md:block claude-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/60 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-4 px-6">
                            <button onClick={() => toggleSort('symbol')} className="flex items-center gap-1.5 hover:text-slate-800">
                              Symbol <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          </th>
                          <th className="py-4 px-6">Sector</th>
                          <th className="py-4 px-6 text-right">
                            <button onClick={() => toggleSort('quantity')} className="flex items-center gap-1.5 hover:text-slate-800 ml-auto">
                              Qty <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          </th>
                          <th className="py-4 px-6 text-right">
                            <button onClick={() => toggleSort('cost')} className="flex items-center gap-1.5 hover:text-slate-800 ml-auto">
                              Invested <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          </th>
                          <th className="py-4 px-6 text-center">Status</th>
                          <th className="py-4 px-6 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formattedStocks.map((stock) => (
                          <tr key={stock.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6">
                              <span className="font-extrabold text-slate-900 tracking-wide">{stock.symbol}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getSectorBadgeClass(stock.sector)}`}>
                                {stock.sector}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-medium text-slate-700">{stock.quantity}</td>
                            <td className="py-4 px-6 text-right font-extrabold text-slate-955">{formatCurrency(stock.total_invested)}</td>
                            <td className="py-4 px-6 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide border ${
                                stock.status === 'Good' 
                                  ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                                  : stock.status === 'Bad'
                                  ? 'bg-rose-50 border-rose-250 text-rose-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-650'
                              }`}>
                                {stock.status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => openModal(stock)}
                                  className="p-1.5 bg-white hover:bg-slate-50 hover:text-slate-900 text-slate-400 rounded-lg border border-slate-200 shadow-sm transition"
                                  title="Edit Stock"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteStock(stock.id, stock.symbol)}
                                  className="p-1.5 bg-white hover:bg-slate-50 hover:text-rose-600 text-slate-400 rounded-lg border border-slate-200 shadow-sm transition"
                                  title="Delete Stock"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards View (visible on small screens) */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {formattedStocks.map((stock) => (
                    <div key={stock.id} className="claude-card p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-extrabold text-slate-900 text-base tracking-wide">{stock.symbol}</span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full w-fit ${getSectorBadgeClass(stock.sector)}`}>
                            {stock.sector}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide border ${
                          stock.status === 'Good' 
                            ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                            : stock.status === 'Bad'
                            ? 'bg-rose-50 border-rose-250 text-rose-700'
                            : 'bg-slate-50 border-slate-200 text-slate-650'
                        }`}>
                          {stock.status}
                        </span>
                      </div>
                      
                      <div className="h-px bg-slate-100 w-full" />
                      
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Quantity</span>
                          <span className="font-semibold text-slate-700 mt-0.5">{stock.quantity}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Invested Value</span>
                          <span className="font-extrabold text-slate-955 mt-0.5">{formatCurrency(stock.total_invested)}</span>
                        </div>
                      </div>
                      
                      <div className="h-px bg-slate-100 w-full" />
                      
                      <div className="flex items-center justify-end gap-2.5">
                        <button 
                          onClick={() => openModal(stock)}
                          className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 shadow-sm transition text-xs font-bold"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteStock(stock.id, stock.symbol)}
                          className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-rose-600 rounded-xl border border-slate-200 shadow-sm transition text-xs font-bold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BACKUP / RESTORE SYNC VIEW */}
        {!loading && activeTab === 'backup' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Export Section */}
            <div className="claude-card p-6 flex flex-col">
              <div className="p-4 bg-[#cc5a37]/10 border border-[#cc5a37]/20 text-[#cc5a37] rounded-2xl w-fit mb-6 shadow-sm">
                <Download className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-950 mb-2">Export Data (Backup)</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Save your portfolio details locally. Exports all records (symbols, quantities, investments, sectors, and statuses) in a standard CSV format that is fully compatible for future imports.
              </p>
              
              <div className="mt-auto">
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-[#cc5a37] hover:bg-[#b84e2e] text-white rounded-xl font-bold text-sm tracking-wide transition shadow-sm"
                >
                  <Download className="w-4.5 h-4.5" />
                  Generate Portfolio CSV Backup
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className="claude-card p-6 flex flex-col">
              <div className="p-4 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl w-fit mb-6 shadow-sm">
                <Upload className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-950 mb-2">Import Data (Restore)</h2>
              <p className="text-sm text-slate-550 mb-6 leading-relaxed">
                Upload your CSV files to quickly restore or bulk-create stock records. 
                Our engine is smart: upload the generic exported template or custom CSV files containing <strong>Security</strong>, <strong>Quantity</strong>, and <strong>Total Cost</strong> columns (like <code>portfolio_data.csv</code>) and they'll map instantly.
              </p>

              {/* Import status message */}
              {importStatus && (
                <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
                  importStatus.type === 'error' 
                    ? 'bg-rose-50 border-rose-200 text-rose-800' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {importStatus.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />}
                  <span className="text-xs font-bold">{importStatus.message}</span>
                </div>
              )}
              
              <div className="mt-auto">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportCSV}
                  accept=".csv"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition border ${
                    isImporting 
                      ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      Parsing Data File...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4.5 h-4.5" />
                      Select CSV File to Restore
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-16 border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <span>© {new Date().getFullYear()} StellarVest App. Build version 1.3.0</span>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-650 transition cursor-pointer">Security Spec</span>
          <span>•</span>
          <span className="hover:text-slate-650 transition cursor-pointer">API Docs</span>
        </div>
      </footer>

      {/* ADD / EDIT STOCK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div onClick={closeModal} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          
          {/* Modal content */}
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-950">
                {editingStock ? `Edit Asset: ${editingStock.symbol}` : 'Add New Portfolio Asset'}
              </h3>
              <button onClick={closeModal} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStock} className="p-6 flex flex-col gap-4">
              {/* Symbol input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-450 uppercase tracking-wider">Symbol *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JKH.N0000"
                  value={formSymbol}
                  onChange={(e) => setFormSymbol(e.target.value)}
                  disabled={!!editingStock}
                  className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#cc5a37] disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-bold tracking-wide"
                />
              </div>

              {/* Quantity input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Quantity *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 500"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#cc5a37] transition text-sm"
                />
              </div>

              {/* Investment (Total cost) input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Total Invested (Cost) *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">Rs.</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formTotalInvested}
                    onChange={(e) => setFormTotalInvested(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#cc5a37] transition text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Sector input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Sector</label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#cc5a37] transition text-sm cursor-pointer"
                  >
                    {AVAILABLE_SECTORS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Status input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#cc5a37] transition text-sm cursor-pointer"
                  >
                    <option value="Neutral">Neutral</option>
                    <option value="Good">Good</option>
                    <option value="Bad">Bad</option>
                  </select>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#cc5a37] hover:bg-[#b84e2e] text-white rounded-xl font-bold text-xs transition shadow-sm"
                >
                  {editingStock ? 'Save Changes' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
