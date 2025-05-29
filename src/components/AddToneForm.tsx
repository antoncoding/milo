import { useState, useEffect } from "react";

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
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center gap-4 mb-6">
        <button 
          className="flex items-center gap-2 p-2 border-0 bg-transparent text-slate-600 cursor-pointer rounded border-0 text-sm hover:text-slate-800 transition-colors duration-200"
          onClick={onCancel}
        >
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="toneName" className="block text-sm font-medium text-slate-800 mb-2">
            Tone Name
          </label>
          <input
            id="toneName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 mb-4 border border-slate-200 rounded-md text-sm transition-all duration-200 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            placeholder="e.g., Professional, Casual, Technical"
            disabled={isEditing} // Prevent editing the name when updating
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="tonePrompt" className="block text-sm font-medium text-slate-800 mb-2">
            Prompt Description
          </label>
          <textarea
            id="tonePrompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-2.5 mb-4 border border-slate-200 rounded-md text-sm min-h-20 resize-y transition-all duration-200 ease-in-out focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            placeholder="Enter the prompt template for this tone..."
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button 
            type="button" 
            className="px-4 py-2.5 border border-slate-200 rounded-md bg-white text-slate-600 text-sm font-medium cursor-pointer transition-all duration-200 ease-in-out hover:border-blue-500 hover:text-blue-500"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="px-4 py-2.5 bg-blue-500 text-white border-0 rounded-md text-sm font-medium cursor-pointer transition-all duration-200 ease-in-out hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!name || !prompt}
          >
            {isEditing ? 'Update Tone' : 'Save Tone'}
          </button>
        </div>
      </form>
    </div>
  );
}
