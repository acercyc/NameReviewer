import React, { useEffect, useState } from 'react';
import { getPeople, deletePerson, updatePerson, Person } from '../lib/db';
import { Trash2, ArrowLeft, Volume2, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export default function PersonList({ onNavigate }: { onNavigate: (view: any) => void, key?: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allPeople = await getPeople();
    setPeople(allPeople);
  };

  const handleDelete = async (id: string) => {
    await deletePerson(id);
    setConfirmDeleteId(null);
    loadData();
  };

  const handleGenerateAudio = async (person: Person) => {
    setGeneratingId(person.id);
    try {
      const { generatePronunciation } = await import('../lib/gemini');
      const audioData = await generatePronunciation(person.name);
      if (audioData) {
        const updatedPerson = { ...person, audioData };
        await updatePerson(updatedPerson);
        setPeople(prev => prev.map(p => p.id === person.id ? updatedPerson : p));
      } else {
        alert("Failed to generate audio. Please try again.");
      }
    } catch (e) {
      console.error("Failed to generate audio:", e);
      alert("Failed to generate audio. Please try again.");
    } finally {
      setGeneratingId(null);
    }
  };

  const playAudio = async (audioData?: string) => {
    if (!audioData) return;
    try {
      const binaryString = atob(audioData);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      try {
        const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
      } catch (e) {
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0;
        }

        const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
      }
    } catch (e) {
      console.error("Audio play failed:", e);
    }
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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col gap-4 pt-2 pb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('dashboard')} className="text-stone-500 hover:text-stone-800 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-semibold text-stone-800">All People</h2>
        </div>
        
        {people.length > 0 && (
          showConfirmReset ? (
            <div className="flex items-center gap-1">
              <button 
                onClick={handleResetProgress}
                className="text-xs font-semibold bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
              >
                Confirm Reset
              </button>
              <button 
                onClick={() => setShowConfirmReset(false)}
                className="text-xs font-semibold bg-stone-100 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowConfirmReset(true)}
              className="text-xs font-semibold bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-300 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Progress
            </button>
          )
        )}
      </div>

      {people.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-stone-400">
          <p className="text-lg font-medium">No people added yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {people.map(person => (
            <div key={person.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
              <img src={person.photoData} alt={person.name} className="w-14 h-14 rounded-full object-cover border-2 border-stone-50" />
              <div className="flex-1">
                <h3 className="font-semibold text-stone-800 text-lg">{person.name}</h3>
                <p className="text-xs font-medium text-stone-500">
                  Next review: {new Date(person.nextReviewDate).toLocaleDateString()}
                </p>
              </div>
              
              {person.audioData ? (
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => playAudio(person.audioData)}
                    className="w-10 h-10 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                    title="Play pronunciation"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  {generatingId === person.id ? (
                    <div className="w-8 h-8 flex items-center justify-center text-stone-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleGenerateAudio(person)}
                      className="w-8 h-8 flex items-center justify-center text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                      title="Regenerate audio"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : generatingId === person.id ? (
                <div className="w-10 h-10 flex items-center justify-center text-stone-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <button 
                  onClick={() => handleGenerateAudio(person)}
                  className="text-xs font-medium bg-stone-100 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-200 transition-colors"
                >
                  Add Audio
                </button>
              )}

              {confirmDeleteId === person.id ? (
                <div className="flex items-center gap-1 ml-1">
                  <button 
                    onClick={() => handleDelete(person.id)}
                    className="text-xs font-medium bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-xs font-medium bg-stone-100 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmDeleteId(person.id)}
                  className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-1"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
