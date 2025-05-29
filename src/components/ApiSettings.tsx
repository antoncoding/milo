import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

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
    <div className="p-4">
      <div className="mb-6">
        <div className="flex items-baseline gap-3 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1721.75 8.25z" />
          </svg>
          <h2 className="text-xl font-semibold text-slate-800">OpenAI API Key</h2>
        </div>
        <p className="text-sm text-slate-600 m-0 leading-5">
          Enter your OpenAI API key to enable AI-powered text transformations
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex gap-3 mb-3">
          <input
            type="password"
            placeholder="Enter your OpenAI API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1 h-9 px-3 border border-slate-200 rounded-md text-sm text-slate-800 transition-all duration-200 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
          />
          <button 
            onClick={handleSaveApiKey}
            className="h-9 px-4 bg-blue-500 text-white border-0 rounded-md text-sm font-medium flex items-center justify-center cursor-pointer transition-all duration-200 ease-in-out hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!apiKey}
          >
            Save Key
          </button>
        </div>
        
        {/* Notification with smooth transitions */}
        <div className="overflow-hidden">
          <div className={`transition-all duration-300 ease-in-out transform ${
            apiKeyStatus 
              ? 'opacity-100 translate-y-0 max-h-20' 
              : 'opacity-0 -translate-y-2 max-h-0'
          }`}>
            {apiKeyStatus && (
              <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                apiKeyStatus.type === 'success' 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 flex-shrink-0 ${
                  apiKeyStatus.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
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
    </div>
  );
}
