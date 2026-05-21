import React, { useState, useEffect } from 'react';
import Form from './Form';
import Viewform from './Viewform';
import Login from './Login';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'view'
  const [records, setRecords] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('medflow_auth') === 'true';
  });

  // Sync records from MongoDB backend on render (falls back to localStorage on failure)
  const syncWithDatabase = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/patients`);
      if (!response.ok) throw new Error('API server returned error');
      const data = await response.json();
      
      setRecords(data);
      setIsOffline(false);
      // Cache latest database state in localStorage
      localStorage.setItem('medflow_submissions', JSON.stringify(data));
    } catch (err) {
      console.warn("Backend API offline. Falling back to local offline mode.", err.message);
      setIsOffline(true);
      
      // Local storage fallback hydration
      const stored = localStorage.getItem('medflow_submissions');
      if (stored) {
        setRecords(JSON.parse(stored));
      } else {
        const dummyData = [
          {
            id: 'rec_1',
            ipNo: '192.168.1.45',
            name: 'Elizabeth Vance',
            age: 28,
            date: '2026-05-20',
            gender: 'Female',
            recordType: 'MSC Patient',
            fileName: 'blood_test_results.pdf',
            fileSize: '1.2 MB',
            fileData: 'data:application/pdf;base64,...',
            createdAt: new Date('2026-05-18T10:30:00Z').toISOString()
          },
          {
            id: 'rec_2',
            ipNo: '10.0.0.122',
            name: 'Gordon Freeman',
            age: 42,
            date: '2026-05-19',
            gender: 'Male',
            recordType: 'Medical Advice',
            fileName: 'brain_mri_scan.jpg',
            fileSize: '4.8 MB',
            fileData: 'data:image/jpeg;base64,...',
            createdAt: new Date('2026-05-19T14:15:00Z').toISOString()
          }
        ];
        localStorage.setItem('medflow_submissions', JSON.stringify(dummyData));
        setRecords(dummyData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncWithDatabase();
  }, []);

  // Update records handler (saves to MongoDB, falls back to local storage)
  const addRecord = async (newRecord) => {
    if (isOffline) {
      // Local Mode
      const updated = [newRecord, ...records];
      setRecords(updated);
      localStorage.setItem('medflow_submissions', JSON.stringify(updated));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord)
      });
      if (!response.ok) throw new Error('API server failed to save patient record');
      
      const savedRecord = await response.json();
      setRecords(prev => [savedRecord, ...prev]);
      
      // Update cache
      const updated = [savedRecord, ...records];
      localStorage.setItem('medflow_submissions', JSON.stringify(updated));
    } catch (err) {
      console.error("API error while saving. Saving locally...", err.message);
      // Fail gracefully to local storage
      setIsOffline(true);
      const updated = [newRecord, ...records];
      setRecords(updated);
      localStorage.setItem('medflow_submissions', JSON.stringify(updated));
    }
  };

  // Delete records handler (removes from MongoDB, falls back to local storage)
  const deleteRecord = async (id) => {
    // Optimistic UI update
    const updated = records.filter(r => (r.id || r._id) !== id);
    setRecords(updated);
    localStorage.setItem('medflow_submissions', JSON.stringify(updated));

    if (isOffline) return;

    try {
      const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('API server failed to delete');
    } catch (err) {
      console.error("API error while deleting. Storing locally...", err.message);
      setIsOffline(true);
    }
  };

  // Stats calculation
  const totalSubmissions = records.length;
  const averageAge = totalSubmissions > 0 
    ? Math.round(records.reduce((acc, cur) => acc + Number(cur.age || 0), 0) / totalSubmissions) 
    : 0;
  const recentActivity = records.length > 0 ? records[0].name : 'No submissions yet';

  return (
    <div className="app-container">
      {/* Premium Header - Always Visible */}
      <header className="main-header">
        <div className="header-brand">
          <div className="brand-logo">
           
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
             
              {isOffline ? (
                <span className="status-badge offline" title="Offline Mode - Saving details to local sandbox">
                  <span className="dot animate-pulse-slow"></span> Local Mode
                </span>
              ) : (
                <span className="status-badge online" title="Sync Status - Direct connection to database secure">
                  <span className="dot"></span> MongoDB Active
                </span>
              )}
            </div>
            <p></p>
          </div>
        </div>

        {isAuthenticated && (
          <nav className="header-nav">
            <button 
              className={`nav-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              New Entry
            </button>
            
            <button 
              className={`nav-btn ${activeTab === 'view' ? 'active' : ''}`}
              onClick={() => setActiveTab('view')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Submissions Log
              {records.length > 0 && <span className="badge">{records.length}</span>}
            </button>
          </nav>
        )}

        {/* User Auth Controls */}
        <div className="header-auth">
          {!isAuthenticated ? (
            <div className="user-avatar-btn disabled" title="Please log in">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          ) : (
            <div 
              className="user-avatar-btn logout-hover" 
              title="Click to Logout"
              onClick={() => {
                setIsAuthenticated(false);
                localStorage.removeItem('medflow_auth');
              }}
            >
              <svg className="avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <svg className="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span className="logout-text">Logout</span>
            </div>
          )}
        </div>
      </header>

      {/* Main App Content - Only visible when logged in */}
      {!isAuthenticated ? (
        <main className="main-content login-wrapper">
          <Login onLoginSuccess={() => {
            setIsAuthenticated(true);
            localStorage.setItem('medflow_auth', 'true');
          }} />
        </main>
      ) : (
        <>
          {/* Stats Summary Bar */}
      <section className="stats-bar">
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 110-8 4 4 0 010 8zm14 14v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalSubmissions}</span>
            <span className="stat-label">Total Patients</span>
          </div>
        </div>
{/* 
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value">{averageAge} <span className="stat-unit">yrs</span></span>
            <span className="stat-label">Mean Patient Age</span>
          </div>
        </div> */}

        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-value text-truncate" title={recentActivity}>{recentActivity}</span>
            <span className="stat-label">Last Submission</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="main-content">
        {isLoading ? (
          <div className="clinical-loading-wrapper">
            <div className="spinner"></div>
            <p>Syncing Clinical Diagnostics Node...</p>
          </div>
        ) : activeTab === 'form' ? (
          <Form onRecordSubmit={addRecord} onViewSubmissions={() => setActiveTab('view')} />
        ) : (
          <Viewform records={records} onDeleteRecord={deleteRecord} />
        )}
      </main>
        </>
      )}
    </div>
  );
}

export default App;
