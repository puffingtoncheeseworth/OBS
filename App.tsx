import React, { useState, useEffect } from 'react';
import { Editor } from './components/Editor';
import { PhraseManager } from './components/PhraseManager';
import { DotPhrase } from './types';

// Default phrases to populate if local storage is empty
const DEFAULT_PHRASES: DotPhrase[] = [
  {
    id: '1',
    trigger: 'soap',
    expansion: 'S: ***\nO: ***\nA: ***\nP: ***',
    category: 'General'
  },
  {
    id: '2',
    trigger: 'normalcardio',
    expansion: 'Regular rate and rhythm. No murmurs, rubs, or gallops. S1 and S2 normal. Capillary refill < 2 seconds.',
    category: 'Cardiology'
  },
  {
    id: '3',
    trigger: 'ros',
    expansion: 'Review of Systems:\n- Const: ***\n- Eyes: ***\n- ENT: ***\n- Resp: ***\n- CVS: ***\n- GI: ***',
    category: 'General'
  },
  {
    id: '4',
    trigger: 'intro',
    expansion: 'Patient is a *** year old *** presenting with *** starting ***.',
    category: 'General'
  }
];

export default function App() {
  const [phrases, setPhrases] = useState<DotPhrase[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mediscribe_phrases');
    if (saved) {
      try {
        setPhrases(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse phrases", e);
        setPhrases(DEFAULT_PHRASES);
      }
    } else {
      setPhrases(DEFAULT_PHRASES);
    }
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage whenever phrases change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('mediscribe_phrases', JSON.stringify(phrases));
    }
  }, [phrases, isLoaded]);

  const handleAddPhrase = (newPhrase: DotPhrase) => {
    setPhrases(prev => [...prev, newPhrase]);
  };

  const handleDeletePhrase = (id: string) => {
    setPhrases(prev => prev.filter(p => p.id !== id));
  };

  if (!isLoaded) return null;

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-slate-900 bg-slate-50">
      {/* Sidebar for Phrase Management */}
      <PhraseManager 
        phrases={phrases} 
        onAddPhrase={handleAddPhrase}
        onDeletePhrase={handleDeletePhrase}
      />
      
      {/* Main Content Area */}
      <Editor phrases={phrases} />
    </div>
  );
}