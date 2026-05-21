import React, { useState } from 'react';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === 'tamilmalar520d@gmail.com' && password === 'vgm123') {
      onLoginSuccess();
    } else {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>MedFlow Secure Gateway</h2>
          <p>Please authenticate to access patient records.</p>
        </div>

        {error && <div className="login-error animate-shake">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Provider Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tamilmalar520d@gmail.com"
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Security Key</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="vgm123"
              required 
            />
          </div>

          <button type="submit" className="login-btn">
            Authenticate & Enter
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
