/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, PlusCircle } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import AddPerson from './components/AddPerson';
import Review from './components/Review';
import PersonList from './components/PersonList';
import ImportFromUrl from './components/ImportFromUrl';

type View = 'dashboard' | 'add' | 'review' | 'review-all' | 'list' | 'import';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <h1 
            className="text-xl font-bold tracking-tight text-stone-800 cursor-pointer flex items-center gap-2" 
            onClick={() => setCurrentView('dashboard')}
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NR</span>
            </div>
            NameRecall
          </h1>
          <nav className="flex items-center gap-5 text-stone-400">
            <button 
              onClick={() => setCurrentView('list')} 
              className={`transition-colors ${currentView === 'list' ? 'text-indigo-600' : 'hover:text-stone-600'}`}
            >
              <Users className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setCurrentView('add')} 
              className={`transition-colors ${currentView === 'add' ? 'text-indigo-600' : 'hover:text-stone-600'}`}
            >
              <PlusCircle className="w-6 h-6" />
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-4 relative overflow-x-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && <Dashboard key="dashboard" onNavigate={setCurrentView} />}
          {currentView === 'add' && <AddPerson key="add" onNavigate={setCurrentView} />}
          {currentView === 'review' && <Review key="review" onNavigate={setCurrentView} />}
          {currentView === 'review-all' && <Review key="review-all" onNavigate={setCurrentView} practiceAllMode={true} />}
          {currentView === 'list' && <PersonList key="list" onNavigate={setCurrentView} />}
          {currentView === 'import' && <ImportFromUrl key="import" onNavigate={setCurrentView} />}
        </AnimatePresence>
      </main>
    </div>
  );
}
