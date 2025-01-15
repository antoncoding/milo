import { useState, useEffect } from "react";
import "../styles/SharedStyles.css";

interface ToneFormProps {
  initialName?: string;
  initialPrompt?: string;
  onSave: (name: string, prompt: string) => Promise<void>;
  onCancel: () => void;
}

export function ToneForm({ initialName = "", initialPrompt = "", onSave, onCancel }: ToneFormProps) {
  const [name, setName] = useState(initialName);
  const [prompt, setPrompt] = useState(initialPrompt);
  const isEditing = initialName !== "";

  useEffect(() => {
    setName(initialName);
    setPrompt(initialPrompt);
  }, [initialName, initialPrompt]);

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
        <h2>{isEditing ? 'Edit Tone' : 'Add New Tone'}</h2>
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
            disabled={isEditing} // Prevent editing the name when updating
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="tonePrompt">Prompt Description</label>
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
            {isEditing ? 'Update Tone' : 'Save Tone'}
          </button>
        </div>
      </form>
    </div>
  );
}
