import React, { useState, useRef, useEffect } from 'react';
import { addPerson, Person } from '../lib/db';
import { generatePronunciation } from '../lib/gemini';
import { Camera, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function AddPerson({ onNavigate }: { onNavigate: (view: any) => void, key?: string }) {
  const [name, setName] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setPhotoData(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleSave = async () => {
    if (!name || !photoData) return;
    setIsSaving(true);

    try {
      // Generate audio using Gemini TTS
      const audioData = await generatePronunciation(name);

      const newPerson: Person = {
        id: crypto.randomUUID(),
        name,
        photoData,
        audioData,
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReviewDate: Date.now(), // Due immediately
      };

      await addPerson(newPerson);
      onNavigate('dashboard');
    } catch (error) {
      console.error("Failed to save person:", error);
      alert("Failed to save person. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6 pt-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-stone-800">Add Person</h2>
        <button onClick={() => onNavigate('dashboard')} className="text-stone-500 font-medium hover:text-stone-800">Cancel</button>
      </div>

      <div className="flex flex-col gap-6">
        <div 
          className="aspect-square w-full max-w-[240px] mx-auto bg-white rounded-[2rem] overflow-hidden border-2 border-dashed border-stone-200 flex items-center justify-center relative cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all shadow-sm"
          onClick={() => fileInputRef.current?.click()}
        >
          {photoData ? (
            <img src={photoData} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-stone-400">
              <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mb-3">
                <Camera className="w-6 h-6 text-stone-500" />
              </div>
              <span className="text-sm font-medium">Tap or paste to add photo</span>
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-stone-700 ml-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jane Doe"
            className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm text-lg"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!name || !photoData || isSaving}
          className="w-full bg-indigo-600 text-white rounded-2xl py-4 px-4 font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-sm mt-4"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Person'
          )}
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-stone-200"></div>
          <span className="flex-shrink-0 mx-4 text-stone-400 text-sm font-medium">OR</span>
          <div className="flex-grow border-t border-stone-200"></div>
        </div>

        <button
          onClick={() => onNavigate('import')}
          className="w-full bg-white border-2 border-stone-200 text-stone-700 rounded-2xl py-4 px-4 font-semibold text-lg flex items-center justify-center gap-2 hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm"
        >
          Import from URL
        </button>
      </div>
    </motion.div>
  );
}
