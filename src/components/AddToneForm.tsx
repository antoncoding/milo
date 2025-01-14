import { useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "../styles/SharedStyles.css";

interface AddToneFormProps {
  onSave: (name: string, prompt: string) => Promise<void>;
  onCancel: () => void;
}

export function AddToneForm({ onSave, onCancel }: AddToneFormProps) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !prompt) return;
    await onSave(name, prompt);
  };

  return (
    <div className="add-tone-form slide-in">
      <div className="form-header">
        <button className="back-button" onClick={onCancel}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <h2>Add New Tone</h2>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="toneName">Tone Name</label>
          <input
            id="toneName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="e.g., Professional, Casual, Technical"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="tonePrompt">Prompt Template</label>
          <textarea
            id="tonePrompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="textarea-field"
            placeholder="Enter the prompt template for this tone..."
          />
        </div>

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={!name || !prompt}>
            Save Tone
          </button>
        </div>
      </form>
    </div>
  );
}
