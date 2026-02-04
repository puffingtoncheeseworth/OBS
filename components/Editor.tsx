import React, { useRef, useState, useEffect, KeyboardEvent } from 'react';
import { DotPhrase } from '../types';
import { Copy, Check, Info } from 'lucide-react';

interface EditorProps {
  phrases: DotPhrase[];
}

export const Editor: React.FC<EditorProps> = ({ phrases }) => {
  const [content, setContent] = useState<string>("Patient presents with ***.\n\nHistory: .soap");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Suggestion Box State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [cursorCoordinates, setCursorCoordinates] = useState({ top: 0, left: 0 });

  // Filter phrases based on current query after the dot
  const filteredPhrases = phrases.filter(p => 
    p.trigger.toLowerCase().startsWith(suggestionQuery.toLowerCase())
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Core Logic: F2 Navigation ---
  const handleF2Navigation = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentPos = textarea.selectionEnd;
    const text = textarea.value;
    
    // Look for *** after current position
    let nextIndex = text.indexOf('***', currentPos);
    
    // Wrap around if not found
    if (nextIndex === -1) {
      nextIndex = text.indexOf('***');
    }

    if (nextIndex !== -1) {
      textarea.focus();
      textarea.setSelectionRange(nextIndex, nextIndex + 3);
      
      // Attempt to scroll into view (simple approximation)
      const blurFactor = 20; 
      // In a real textarea, exact scroll is hard without a mirror div, 
      // but focus() usually handles scrolling in modern browsers.
    }
  };

  // --- Core Logic: Dot Phrase Detection ---
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // F2 Key for Navigation
    if (e.key === 'F2') {
      e.preventDefault();
      handleF2Navigation();
      return;
    }

    // Navigation inside suggestion box
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev + 1) % filteredPhrases.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev - 1 + filteredPhrases.length) % filteredPhrases.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredPhrases[suggestionIndex]) {
          insertPhrase(filteredPhrases[suggestionIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const newPos = e.target.selectionEnd;
    setContent(newVal);

    // Detect dot phrase trigger
    // We look at the text before the cursor
    const textBeforeCursor = newVal.slice(0, newPos);
    
    // Regex to match a dot followed by alphanumeric characters at the end of the string
    // e.g. "Patient is .so" -> match ".so"
    const match = textBeforeCursor.match(/\.([a-zA-Z0-9]*)$/);

    if (match) {
      const query = match[1];
      setSuggestionQuery(query);
      setShowSuggestions(true);
      setSuggestionIndex(0);
      
      // Calculate approximated position for the popup
      // Note: Getting exact pixel coordinates in a textarea is complex. 
      // We will anchor the menu to the bottom left of the cursor line or simply 
      // display it in a fixed context sensitive location for robustness.
      // For this demo, we'll use a simplified caret follower or a fixed overlay.
    } else {
      setShowSuggestions(false);
    }
  };

  const insertPhrase = (phrase: DotPhrase) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentPos = textarea.selectionEnd;
    const text = textarea.value;
    const textBeforeCursor = text.slice(0, currentPos);
    
    // Find the start of the trigger (the dot)
    const triggerLength = suggestionQuery.length + 1; // +1 for dot
    const startIdx = currentPos - triggerLength;
    
    const newText = 
      text.slice(0, startIdx) + 
      phrase.expansion + 
      text.slice(currentPos);
    
    setContent(newText);
    setShowSuggestions(false);
    
    // Restore focus and move cursor to end of inserted phrase
    // Use setTimeout to ensure React render cycle completes
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startIdx + phrase.expansion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      
      // If the inserted phrase contains ***, immediately jump to the first one? 
      // Optional, but F2 is manual. Let's trigger F2 logic automatically if desirable.
      // For now, let's leave it manual F2 as requested.
    }, 0);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      {/* Header / Toolbar */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded border border-slate-200">
            <kbd className="font-mono font-bold text-slate-700">F2</kbd> Next Wildcard
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded border border-slate-200">
            <kbd className="font-mono font-bold text-slate-700">.</kbd> Trigger Phrase
          </span>
        </div>
        
        <button 
          onClick={handleCopy}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
            copied 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow'
          }`}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copied to Clipboard' : 'Copy All Text'}
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 p-6 overflow-hidden relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="w-full h-full p-8 text-lg leading-relaxed font-sans text-slate-800 bg-white rounded-xl shadow-sm border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none font-medium placeholder-slate-300"
          placeholder="Start typing your note here... Use .phrase to expand text and *** for placeholders."
        />

        {/* Suggestion Popover */}
        {showSuggestions && filteredPhrases.length > 0 && (
          <div 
            className="absolute bottom-10 left-10 z-50 w-72 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
              <span>Smart Phrases</span>
              <span className="text-slate-400">Match: .{suggestionQuery}</span>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredPhrases.map((phrase, idx) => (
                <div
                  key={phrase.id}
                  onClick={() => insertPhrase(phrase)}
                  className={`px-4 py-2 cursor-pointer border-l-4 transition-colors ${
                    idx === suggestionIndex 
                      ? 'bg-blue-50 border-blue-500' 
                      : 'bg-white border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-sm">.{phrase.trigger}</span>
                    <span className="text-[10px] bg-slate-200 px-1.5 rounded text-slate-600 uppercase">{phrase.category}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
              <span>Enter to select</span>
              <span>↑↓ to navigate</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="px-6 py-2 bg-slate-50 text-xs text-slate-400 border-t border-slate-200 flex items-center gap-2">
        <Info size={12} />
        <span>Use <span className="font-mono text-slate-600">***</span> in your text to create jump points. Press F2 to jump to them.</span>
      </div>
    </div>
  );
};