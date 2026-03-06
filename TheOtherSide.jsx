import React, { useState, useCallback } from 'react';

const TheOtherSide = () => {
  const [status, setStatus] = useState('idle'); // idle | processing | revealed
  const [lens, setLens] = useState('Empathy Mirror');
  const [result, setResult] = useState(null);

  const lenses = [
    { id: 'empathy', label: 'Empathy Mirror', icon: '🪞' },
    { id: 'mediator', label: 'Conflict Mediator', icon: '⚖️' },
    { id: 'flipper', label: 'Bias / Crisis Flipper', icon: '🔄' },
    { id: 'history', label: 'History Retold', icon: '📜' },
    { id: 'devils', label: "Devil's Advocate", icon: '😈' }
  ];

  const handleReveal = async () => {
    setStatus('processing');
    // Call your FastAPI /flip/async endpoint here
    // For now, simulating a 3-second generation
    setTimeout(() => setStatus('revealed'), 3000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#a0a0a5] font-sans selection:bg-white/10 selection:text-white">
      {/* Header */}
      <nav className="p-8 flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-white rounded-full border-r-transparent animate-pulse" />
          <div>
            <h1 className="text-2xl font-serif text-white tracking-tight">The Other Side</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-50">Every story has another perspective</p>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-widest flex gap-4 opacity-40">
          <span>Multimodal</span> • <span>Narrative</span> • <span>Empathy</span>
          <span className="text-white/60">Powered by Gemini 3</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto pt-12 px-6 flex flex-col items-center">
        {/* Lens Selector */}
        <div className="mb-16 text-center">
          <p className="text-[10px] uppercase tracking-widest mb-6 opacity-30">Choose your lens</p>
          <div className="flex flex-wrap justify-center gap-3">
            {lenses.map((l) => (
              <button
                key={l.id}
                onClick={() => setLens(l.label)}
                className={`px-5 py-2 rounded-full border text-xs transition-all duration-500 flex items-center gap-2 ${
                  lens === l.label 
                  ? 'border-white text-white bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                  : 'border-white/5 hover:border-white/20'
                }`}
              >
                <span className="opacity-60">{l.icon}</span> {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dropzone Area */}
        <div className="w-full max-w-2xl group">
          <div className="relative border border-dashed border-white/10 rounded-3xl p-20 bg-white/[0.01] group-hover:bg-white/[0.03] group-hover:border-white/20 transition-all duration-700 flex flex-col items-center justify-center text-center">
            {status === 'idle' ? (
              <>
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-xl mb-6 group-hover:scale-110 transition-transform">
                  +
                </div>
                <h2 className="text-2xl font-serif italic text-white mb-2">Share your moment</h2>
                <p className="text-sm opacity-40">Image, Audio, Video • or <button className="underline hover:text-white">paste a URL</button></p>
              </>
            ) : status === 'processing' ? (
              <div className="flex flex-col items-center py-10">
                <div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin mb-6" />
                <p className="font-serif italic text-white animate-pulse">Consulting the {lens}...</p>
              </div>
            ) : (
              <div className="animate-fade-in text-left">
                {/* Result Media would go here (Video/Image/Audio) */}
                <h2 className="text-3xl font-serif text-white mb-6 leading-tight">A quiet bridge across the divide.</h2>
                <p className="text-lg leading-relaxed mb-8 text-white/80">This is where the agent's symmetric response appears...</p>
                <div className="flex gap-2">
                   <div className="px-3 py-1 rounded bg-white/5 text-[10px] uppercase tracking-widest">Grounded Fact</div>
                </div>
              </div>
            )}
          </div>

          {/* Context Input */}
          <div className="mt-8 flex gap-4">
            <input 
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-6 py-4 text-sm focus:outline-none focus:border-white/30 transition-colors placeholder:opacity-30"
              placeholder="Add context (optional) — what's the situation from your view?"
            />
            <button 
              onClick={handleReveal}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-8 rounded-xl text-xs uppercase tracking-widest transition-all"
            >
              Reveal
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full p-8 flex justify-between text-[9px] uppercase tracking-[0.3em] opacity-30">
        <span>● The Other Side • Empathy Engine</span>
        <span>claude-sonnet-4 / Gemini 3</span>
      </footer>
    </div>
  );
};

export default TheOtherSide;