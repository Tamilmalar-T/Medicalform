import React, { useState } from 'react';
import './Form.css';

function Form({ onRecordSubmit, onViewSubmissions }) {
  const [formData, setFormData] = useState({
    ipNo: '',
    name: '',
    age: '',
    date: new Date().toISOString().split('T')[0], // prefill with current date
    gender: '',
    recordType: '',
  });

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live form completeness check
  const calculateCompleteness = () => {
    let score = 0;
    if (formData.ipNo) score += 1;
    if (formData.name) score += 1;
    if (formData.age) score += 1;
    if (formData.date) score += 1;
    if (formData.gender) score += 1;
    if (formData.recordType) score += 1;
    if (file) score += 1;
    return Math.round((score / 7) * 100);
  };

  const completeness = calculateCompleteness();

  // Validate form fields
  const validate = () => {
    const newErrors = {};
    
    // IP Validation (IPv4 regex)
    const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!formData.ipNo) {
      newErrors.ipNo = 'IP Address is required';
    } else if (!ipRegex.test(formData.ipNo)) {
      newErrors.ipNo = 'Please enter a valid IPv4 address (e.g. 192.168.1.1)';
    }

    // Name Validation
    if (!formData.name.trim()) {
      newErrors.name = 'Patient name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Age Validation
    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else {
      const ageNum = parseInt(formData.age, 10);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 125) {
        newErrors.age = 'Please enter a realistic age (1 - 125)';
      }
    }

    // Date Validation
    if (!formData.date) {
      newErrors.date = 'Record date is required';
    }

    // Gender Validation
    if (!formData.gender) {
      newErrors.gender = 'Please select patient gender';
    }

    // Category Validation
    if (!formData.recordType) {
      newErrors.recordType = 'Please select a record category';
    }

    // File Validation
    if (!file) {
      setFileError('Medical report file is required');
      newErrors.file = true;
    } else {
      setFileError('');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Text/Select Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error as they type
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Process File Selection & Convert to Base64 (for mock database saving)
  const processFile = (selectedFile) => {
    if (!selectedFile) return;

    // Check size limit (e.g., 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setFileError('File size exceeds the 5MB limit');
      setFile(null);
      return;
    }

    setFileError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setFile({
        name: selectedFile.name,
        size: formatBytes(selectedFile.size),
        type: selectedFile.type,
        data: reader.result // Base64 encoding
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  // Helper to format bytes to readable size
  const formatBytes = (bytes, decimals = 1) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  // Drag and Drop event handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    // Simulate clinical network request delay
    setTimeout(() => {
      const record = {
        id: `rec_${Date.now()}`,
        ipNo: formData.ipNo,
        name: formData.name.trim(),
        age: parseInt(formData.age, 10),
        date: formData.date,
        gender: formData.gender,
        fileName: file.name,
        fileSize: file.size,
        fileData: file.data, // Base64 url
        recordType: formData.recordType,
        createdAt: new Date().toISOString()
      };

      onRecordSubmit(record);
      setIsSubmitting(false);
      setShowSuccessModal(true);
    }, 1200);
  };

  const resetForm = () => {
    setFormData({
      ipNo: '',
      name: '',
      age: '',
      date: new Date().toISOString().split('T')[0],
      gender: '',
      recordType: '',
    });
    setFile(null);
    setFileError('');
    setErrors({});
    setShowSuccessModal(false);
  };

  return (
    <div className="form-card animate-fade-in">
      <div className="form-card-header">
        <div className="header-info">
          <h2>Patient Record Intake Form</h2>
          <p>Please enter details accurately to sync with the digital diagnostic records.</p>
        </div>
        <div className="completeness-indicator">
          <div className="progress-ring-container">
            <svg className="progress-ring" width="56" height="56">
              <circle
                className="progress-ring__circle-bg"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="4"
                fill="transparent"
                r="24"
                cx="28"
                cy="28"
              />
              <circle
                className="progress-ring__circle"
                stroke="var(--primary)"
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 - (completeness / 100) * (2 * Math.PI * 24)}`}
                strokeLinecap="round"
                fill="transparent"
                r="24"
                cx="28"
                cy="28"
              />
            </svg>
            <span className="progress-percentage">{completeness}%</span>
          </div>
          <span className="completeness-label">Complete</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="intake-form">
        {/* Row 1: IP Address & Full Name */}
        <div className="form-row two-cols">
          <div className={`form-group ${errors.ipNo ? 'has-error' : ''}`}>
            <label htmlFor="ipNo">
              Patient IP No
              <span className="tooltip-icon" title="Unique workstation IP associated with patient registration">?</span>
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="ipNo"
                name="ipNo"
                placeholder="e.g. 192.168.1.100"
                value={formData.ipNo}
                onChange={handleInputChange}
                className="custom-input"
              />
              <span className="input-icon"></span>
            </div>
            {errors.ipNo && <span className="error-message">{errors.ipNo}</span>}
          </div>

          <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
            <label htmlFor="name">Patient Full Name</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="name"
                name="name"
                placeholder="your name"
                value={formData.name}
                onChange={handleInputChange}
                className="custom-input"
              />
              <span className="input-icon"></span>
            </div>
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>
        </div>

        {/* Row 2: Age, Date & Gender */}
        <div className="form-row three-cols">
          <div className={`form-group ${errors.age ? 'has-error' : ''}`}>
            <label htmlFor="age">Age</label>
            <input
              type="number"
              id="age"
              name="age"
              placeholder="Age"
              min="1"
              max="125"
              value={formData.age}
              onChange={handleInputChange}
              className="custom-input text-center"
            />
            {errors.age && <span className="error-message">{errors.age}</span>}
          </div>

          <div className={`form-group ${errors.date ? 'has-error' : ''}`}>
            <label htmlFor="date">Intake Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="custom-input"
            />
            {errors.date && <span className="error-message">{errors.date}</span>}
          </div>

          <div className={`form-group ${errors.gender ? 'has-error' : ''}`}>
            <label>Gender</label>
            <div className="gender-selector">
              <label className={`gender-option ${formData.gender === 'Male' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={formData.gender === 'Male'}
                  onChange={handleInputChange}
                />
                Male
              </label>
              <label className={`gender-option ${formData.gender === 'Female' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={formData.gender === 'Female'}
                  onChange={handleInputChange}
                />
                Female
              </label>
              <label className={`gender-option ${formData.gender === 'Other' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="gender"
                  value="Other"
                  checked={formData.gender === 'Other'}
                  onChange={handleInputChange}
                />
                Other
              </label>
            </div>
            {errors.gender && <span className="error-message">{errors.gender}</span>}
          </div>
          {/* New Category Dropdown */}
          <div className={`form-group ${errors.recordType ? 'has-error' : ''}`}>
            <label htmlFor="recordType">Record Category</label>
            <select
              id="recordType"
              name="recordType"
              value={formData.recordType}
              onChange={handleInputChange}
              className="custom-input"
            >
              <option value="" disabled>Select a category...</option>
              <option value="MSC Patient">MSC Patient</option>
              <option value="Medical Advice">Medical Advice</option>
              <option value="Birth">Birth</option>
              <option value="Death">Death</option>
            </select>
            {errors.recordType && <span className="error-message">{errors.recordType}</span>}
          </div>
        </div>

        {/* Row 3: Drag & Drop File Upload */}
        <div className={`form-group ${fileError ? 'has-error' : ''}`}>
          <label>Upload Diagnostic / Medical Reports</label>
          <div 
            className={`file-dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!file ? (
              <div className="dropzone-placeholder">
                <div className="upload-cloud-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="dropzone-text">
                  <p className="main-drop-text">Drag & drop files here, or <span className="browse-link">browse</span></p>
                  <p className="sub-drop-text">PDF, Images (JPG/PNG) up to 5MB</p>
                </div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden-file-input"
                  onChange={handleFileChange}
                  accept=".pdf,image/*"
                />
                {/* Visual click overlay */}
                <label htmlFor="file-upload" className="dropzone-overlay-label" />
              </div>
            ) : (
              <div className="dropzone-file-preview">
                <div className="file-preview-details">
                  <div className="file-preview-icon">
                    {file.type.includes('pdf') ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <path d="M14 2v6h6M16 13H8M16 17H8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="file-info-text">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{file.size}</span>
                  </div>
                </div>
                <button type="button" className="remove-file-btn" onClick={() => setFile(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
          {fileError && <span className="error-message">{fileError}</span>}
        </div>

        {/* Action Button */}
        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="btn-spinner"></span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Upload & Save Intake Record
            </>
          )}
        </button>
      </form>

      {/* Success Modal / Screen Overlay */}
      {showSuccessModal && (
        <div className="success-overlay animate-fade-in">
          <div className="success-modal animate-scale-up">
            <div className="success-icon-wrapper">
              <svg className="checkmark" viewBox="0 0 52 52">
                <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <h3>Intake Successfully Synced!</h3>
            <p>
              The record for <strong>{formData.name}</strong> was registered and successfully
              encrypted to our clinical logging nodes.
            </p>
            <div className="modal-actions">
              <button className="primary-modal-btn" onClick={resetForm}>
                Add Another Patient
              </button>
              <button className="secondary-modal-btn" onClick={() => { resetForm(); onViewSubmissions(); }}>
                View Records Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Form;
