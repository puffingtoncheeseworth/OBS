import React, { useState } from 'react';
import { DotPhrase } from '../types';
import { Plus, Trash2, Sparkles, Search, Save, Download, Code } from 'lucide-react';
import { generateSmartPhrase } from '../services/geminiService';
import { PluginGenerator } from './PluginGenerator';

interface PhraseManagerProps {
  phrases: DotPhrase[];
  onAddPhrase: (phrase: DotPhrase) => void;
  onDeletePhrase: (id: string) => void;
}

export const PhraseManager: React.FC<PhraseManagerProps> = ({ phrases, onAddPhrase, onDeletePhrase }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPluginGenerator, setShowPluginGenerator] = useState(false);
  
  // Form State
  const [newTrigger, setNewTrigger] = useState('');
  const [newExpansion, setNewExpansion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!newTrigger) {
      alert("Please enter a trigger name or a short description to guide the AI.");
      return;
    }
    setIsGenerating(true);
    try {
      const generated = await generateSmartPhrase(newTrigger + (newExpansion ? " " + newExpansion : ""));
      setNewExpansion(generated);
    } catch (e) {
      alert("AI Generation failed. Check console/network.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!newTrigger || !newExpansion) return;
    
    const cleanTrigger = newTrigger.startsWith('.') ? newTrigger.slice(1) : newTrigger;

    const newPhrase: DotPhrase = {
      id: crypto.randomUUID(),
      trigger: cleanTrigger,
      expansion: newExpansion,
      category: 'Custom'
    };
    
    onAddPhrase(newPhrase);
    setNewTrigger('');
    setNewExpansion('');
    setIsCreating(false);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(phrases, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "mediscribe_phrases.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const filteredPhrases = phrases.filter(p => 
    p.trigger.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.expansion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col h-full bg-white border-r border-slate-200 w-80 shadow-sm z-10">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="text-blue-600 text-xl">.</span> Dot Phrases
            </h2>
            <div className="flex gap-1">
              <button 
                onClick={() => setShowPluginGenerator(true)}
                className="text-slate-400 hover:text-purple-600 transition-colors p-1 rounded-md hover:bg-slate-100"
                title="Generate Obsidian Plugin"
              >
                <Code size={18} />
              </button>
              <button 
                onClick={handleExport}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-slate-100"
                title="Export Phrases to JSON"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search phrases..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {isCreating && (
            <div className="p-3 border-2 border-blue-100 rounded-lg bg-blue-50/50 mb-4 animate-in fade-in zoom-in-95 duration-200">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Trigger (e.g. "soap")</label>
              <div className="flex items-center gap-1 mb-3">
                <span className="text-slate-500 font-bold">.</span>
                <input 
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="flex-1 p-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="phrase_name"
                />
              </div>
              
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expansion Content</label>
              <textarea 
                value={newExpansion}
                onChange={(e) => setNewExpansion(e.target.value)}
                className="w-full p-2 text-sm border border-slate-300 rounded h-32 focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-2"
                placeholder="Full text with *** placeholders..."
              />

              <div className="flex gap-2">
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200 py-1.5 rounded text-xs font-medium transition-colors"
                >
                  {isGenerating ? 'Thinking...' : <><Sparkles size={14} /> AI Draft</>}
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white hover:bg-blue-700 py-1.5 rounded text-xs font-medium transition-colors"
                >
                  <Save size={14} /> Save
                </button>
              </div>
              <button 
                onClick={() => setIsCreating(false)} 
                className="w-full mt-2 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          )}

          {filteredPhrases.map(phrase => (
            <div key={phrase.id} className="group relative p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-1">
                <span className="font-mono text-blue-600 font-bold text-sm bg-blue-100 px-1.5 py-0.5 rounded">
                  .{phrase.trigger}
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeletePhrase(phrase.id); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {phrase.expansion}
              </p>
            </div>
          ))}
          
          {filteredPhrases.length === 0 && !isCreating && (
            <div className="text-center p-8 text-slate-400 text-sm">
              No phrases found.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-white">
          <button 
            onClick={() => setIsCreating(true)}
            disabled={isCreating}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} /> New Dot Phrase
          </button>
        </div>
      </div>

      {showPluginGenerator && (
        <PluginGenerator onClose={() => setShowPluginGenerator(false)} />
      )}
    </>
  );
};