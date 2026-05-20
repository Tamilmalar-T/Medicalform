import React, { useState } from 'react';
import './Viewform.css';

function Viewform({ records, onDeleteRecord }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null); // Patient detail card modal
  const [genderFilter, setGenderFilter] = useState('All'); // 'All' | 'Male' | 'Female' | 'Other'

  // Filter records based on search and gender dropdown
  const filteredRecords = records.filter((rec) => {
    const matchesSearch = 
      rec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.ipNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGender = genderFilter === 'All' || rec.gender === genderFilter;

    return matchesSearch && matchesGender;
  });

  // Action helper to download files locally (since we converted to base64)
  const handleDownloadFile = (record) => {
    if (!record.fileData || record.fileData.includes('...')) {
      alert("Note: This is a placeholder record file. Newly uploaded files are fully downloadable!");
      return;
    }
    const link = document.createElement('a');
    link.href = record.fileData;
    link.download = record.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="view-card animate-fade-in">
      <div className="view-card-header">
        <div>
          <h2>Patient Submissions Log</h2>
          <p>Real-time database of intake records. Search, manage, and verify submissions.</p>
        </div>
      </div>

      {/* Control Panel: Search & Filters */}
      <div className="controls-panel">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by patient name or IP address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>&times;</button>
          )}
        </div>

        <div className="filter-dropdown">
          <label htmlFor="gender-filter">Gender:</label>
          <select
            id="gender-filter"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="custom-select"
          >
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Main Records Presentation */}
      {filteredRecords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5.586a1 1 0 00-.707.293l-1.414 1.414a1 1 0 01-.707.293H8.707A1 1 0 018 17.707L6.586 16.293A1 1 0 005.879 16H4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>No Records Found</h3>
          <p>
            {records.length === 0 
              ? "The clinical logging system is currently empty. Get started by filing an intake form!" 
              : "No logs matched your current filters or search query."}
          </p>
        </div>
      ) : (
        <div className="table-responsive-wrapper">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>IP Address</th>
                <th>Age</th>
                <th>Intake Date</th>
                <th>Gender</th>
                <th>Diagnostic File</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="record-row" onClick={() => setSelectedRecord(record)}>
                  {/* Name column */}
                  <td className="font-semibold text-primary-cell">
                    <div className="avatar-placeholder">
                      {record.name.charAt(0).toUpperCase()}
                    </div>
                    {record.name}
                  </td>
                  
                  {/* IP column */}
                  <td>
                    <code className="ip-badge">{record.ipNo}</code>
                  </td>

                  {/* Age column */}
                  <td>{record.age} yrs</td>

                  {/* Date column */}
                  <td>{record.date}</td>

                  {/* Gender column */}
                  <td>
                    <span className={`gender-tag ${record.gender.toLowerCase()}`}>
                      {record.gender}
                    </span>
                  </td>

                  {/* File column */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="file-link-btn" 
                      onClick={() => handleDownloadFile(record)}
                      title={`Download ${record.fileName} (${record.fileSize})`}
                    >
                      <svg className="file-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="file-name-truncate">{record.fileName}</span>
                    </button>
                  </td>

                  {/* Actions column */}
                  <td className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="table-actions">
                      <button 
                        className="action-icon-btn view-btn"
                        onClick={() => setSelectedRecord(record)}
                        title="View Full Profile Card"
                      >
                        👁️
                      </button>
                      <button 
                        className="action-icon-btn delete-btn"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete patient record for ${record.name}?`)) {
                            onDeleteRecord(record.id);
                          }
                        }}
                        title="Delete Record"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedRecord && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setSelectedRecord(null)}>
          <div className="patient-card-modal animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedRecord(null)}>&times;</button>
            
            <div className="patient-card-header">
              <div className="avatar-large">
                {selectedRecord.name.charAt(0).toUpperCase()}
              </div>
              <div className="patient-header-details">
                <h3>{selectedRecord.name}</h3>
                <span className="patient-id">Record ID: {selectedRecord.id}</span>
              </div>
            </div>

            <div className="patient-card-grid">
              <div className="grid-item">
                <span className="grid-label">Workstation IP Address</span>
                <code className="grid-value ip-code">{selectedRecord.ipNo}</code>
              </div>
              <div className="grid-item">
                <span className="grid-label">Age</span>
                <span className="grid-value">{selectedRecord.age} Years Old</span>
              </div>
              <div className="grid-item">
                <span className="grid-label">Intake Date</span>
                <span className="grid-value">{selectedRecord.date}</span>
              </div>
              <div className="grid-item">
                <span className="grid-label">Gender</span>
                <span className={`gender-tag ${selectedRecord.gender.toLowerCase()} large`}>
                  {selectedRecord.gender}
                </span>
              </div>
            </div>

            {/* Diagnostic Document Preview Section */}
            <div className="diagnostic-document-section">
              <h4>Diagnostic Documents</h4>
              <div className="document-preview-box">
                <div className="document-preview-header">
                  <div className="doc-icon">
                    {selectedRecord.fileName.includes('.pdf') ? '📄' : '🖼️'}
                  </div>
                  <div className="doc-meta">
                    <span className="doc-name">{selectedRecord.fileName}</span>
                    <span className="doc-size">{selectedRecord.fileSize}</span>
                  </div>
                  <button 
                    className="download-btn-circle"
                    onClick={() => handleDownloadFile(selectedRecord)}
                    title="Download document file"
                  >
                    ⬇️
                  </button>
                </div>

                {/* If image and data URL exists, show small inline preview */}
                {selectedRecord.fileData && 
                 !selectedRecord.fileData.includes('...') && 
                 selectedRecord.fileData.startsWith('data:image/') && (
                  <div className="image-preview-wrapper">
                    <img 
                      src={selectedRecord.fileData} 
                      alt="Uploaded Medical File Preview" 
                      className="inline-doc-img"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer-actions">
              <button className="btn-close-modal" onClick={() => setSelectedRecord(null)}>
                Dismiss Record View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Viewform;
