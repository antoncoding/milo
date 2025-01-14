import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "../styles/SharedStyles.css";

export function ApiSettings() {
  const [apiKey, setApiKey] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    invoke<string>("get_api_key")
      .then((key) => setApiKey(key))
      .catch(console.error);
  }, []);

  const handleSaveApiKey = async () => {
    try {
      await invoke("save_api_key", { key: apiKey });
      setApiKeyStatus({ message: "API key saved successfully!", type: 'success' });
      setTimeout(() => setApiKeyStatus(null), 3000);
    } catch (error) {
      console.error("Failed to save API key:", error);
      setApiKeyStatus({ message: "Failed to save API key. Please try again.", type: 'error' });
      setTimeout(() => setApiKeyStatus(null), 3000);
    }
  };

  return (
    <div className="settings-container">
      <div className="api-key-section">
        <div className="section-header">
          <div className="header-content">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="section-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            <h2>OpenAI API Key</h2>
          </div>
          <p className="header-description">
            Enter your OpenAI API key to enable AI-powered text transformations
          </p>
        </div>

        <div className="input-group">
          <div className="input-row">
            <input
              type="password"
              placeholder="Enter your OpenAI API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-field"
            />
            <button 
              onClick={handleSaveApiKey}
              className="primary-button"
              disabled={!apiKey}
            >
              Save Key
            </button>
          </div>
          {apiKeyStatus && (
            <div className={`status-message status-${apiKeyStatus.type}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="status-icon">
                {apiKeyStatus.type === 'success' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                )}
              </svg>
              {apiKeyStatus.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
