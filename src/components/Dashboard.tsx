import React, { useEffect, useState } from 'react';
import { getPeople, Person, updatePerson } from '../lib/db';
import { Play, Plus, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard({ onNavigate }: { onNavigate: (view: any) => void, key?: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allPeople = await getPeople();
    setPeople(allPeople);
    
    const now = Date.now();
    const due = allPeople.filter(p => p.nextReviewDate <= now);
    setDueCount(due.length);
  };

  const handleResetProgress = async () => {
    for (const person of people) {
      await updatePerson({
        ...person,
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: Date.now()
      });
    }
    setShowConfirmReset(false);
    loadData();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6"
    >
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100 flex flex-col items-center text-center mt-4">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl font-bold text-indigo-600">{dueCount}</span>
        </div>
        <h2 className="text-2xl font-semibold text-stone-800 mb-2">Due for Review</h2>
        <p className="text-stone-500 text-base mb-8">
          {dueCount === 0 
            ? "You're all caught up for today!" 
            : `You have ${dueCount} people to review today.`}
        </p>

        <button
          onClick={() => dueCount === 0 ? onNavigate('review-all') : onNavigate('review')}
          disabled={people.length === 0}
          className="w-full bg-indigo-600 text-white rounded-2xl py-4 px-4 font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Play className="w-5 h-5 fill-current" />
          {dueCount === 0 && people.length > 0 ? "Practice All (Shuffled)" : "Start Review"}
        </button>

        {people.length > 0 && (
          showConfirmReset ? (
            <div className="mt-4 flex flex-col items-center gap-2 w-full">
              <p className="text-sm text-red-500 font-medium">Reset all progress to zero?</p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleResetProgress}
                  className="flex-1 bg-red-100 text-red-600 py-2 rounded-xl text-sm font-semibold hover:bg-red-200 transition-colors"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="flex-1 bg-stone-100 text-stone-600 py-2 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="mt-4 text-sm font-medium text-stone-400 hover:text-stone-600 flex items-center justify-center gap-1.5 transition-colors w-full py-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset All Progress
            </button>
          )
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex flex-col justify-center">
          <p className="text-stone-500 text-sm font-medium mb-1">Total People</p>
          <p className="text-3xl font-bold text-stone-800">{people.length}</p>
        </div>
        <button
          onClick={() => onNavigate('add')}
          className="bg-stone-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-stone-600 hover:bg-stone-200 transition-colors"
        >
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Plus className="w-5 h-5 text-stone-800" />
          </div>
          <span className="text-sm font-semibold text-stone-800">Add Person</span>
        </button>
      </div>
    </motion.div>
  );
}
