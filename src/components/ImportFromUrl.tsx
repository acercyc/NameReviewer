import React, { useState } from 'react';
import { addPerson, Person } from '../lib/db';
import { generatePronunciation } from '../lib/gemini';
import { GoogleGenAI, Type } from "@google/genai";
import { Loader2, Download, CheckCircle2, Circle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface ExtractedPerson {
  name: string;
  photoUrl: string;
}

export default function ImportFromUrl({ onNavigate }: { onNavigate: (view: any) => void, key?: string }) {
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPeople, setExtractedPeople] = useState<ExtractedPerson[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const handleExtract = async () => {
    if (!url) return;
    setIsExtracting(true);
    setExtractedPeople([]);
    setSelectedIndices(new Set());

    try {
      // 1. Fetch HTML via proxy
      const proxyRes = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!proxyRes.ok) throw new Error("Failed to fetch URL");
      const html = await proxyRes.text();

      // 2. Use Gemini to extract names and photo URLs
      const ai = new GoogleGenAI({ apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract the names and photo URLs of all people listed in this HTML. Resolve any relative photo URLs using the base URL: ${url}\n\nHTML:\n${html.substring(0, 500000)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                photoUrl: { type: Type.STRING }
              },
              required: ["name", "photoUrl"]
            }
          }
        }
      });

      const jsonStr = response.text || "[]";
      const people: ExtractedPerson[] = JSON.parse(jsonStr);
      setExtractedPeople(people);
      setSelectedIndices(new Set(people.map((_, i) => i))); // Select all by default
    } catch (error) {
      console.error("Extraction failed:", error);
      alert("Failed to extract people from the URL. Please check the URL and try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleImport = async () => {
    if (selectedIndices.size === 0) return;
    setIsImporting(true);
    setImportProgress(0);

    const selectedPeople = Array.from(selectedIndices).map(i => extractedPeople[i]);
    
    try {
      for (let i = 0; i < selectedPeople.length; i++) {
        const person = selectedPeople[i];
        
        // Fetch image as base64 via proxy
        const imgRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(person.photoUrl)}&base=${encodeURIComponent(url)}`);
        if (!imgRes.ok) throw new Error(`Failed to fetch image for ${person.name}`);
        const { data: rawPhotoData } = await imgRes.json();

        // Resize image
        const photoData = await new Promise<string>((resolve, reject) => {
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
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = reject;
          img.src = rawPhotoData;
        });

        // Generate TTS
        const audioData = await generatePronunciation(person.name);

        const newPerson: Person = {
          id: crypto.randomUUID(),
          name: person.name,
          photoData,
          audioData,
          repetition: 0,
          interval: 0,
          easeFactor: 2.5,
          nextReviewDate: Date.now(),
        };

        await addPerson(newPerson);
        setImportProgress(i + 1);
      }
      
      onNavigate('dashboard');
    } catch (error) {
      console.error("Import failed:", error);
      alert("An error occurred during import. Some people may not have been saved.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6 pt-4 h-[calc(100vh-80px)]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('dashboard')} className="text-stone-400 hover:text-stone-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-semibold text-stone-800">Import from URL</h2>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-stone-500 text-sm">
          Paste a website URL containing a list of people (like a team page or directory). The app will automatically extract their names and photos.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/team"
            className="flex-1 bg-white border border-stone-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm text-lg"
            disabled={isExtracting || isImporting}
          />
          <button
            onClick={handleExtract}
            disabled={!url || isExtracting || isImporting}
            className="bg-indigo-600 text-white rounded-2xl px-6 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Extract'}
          </button>
        </div>
      </div>

      {extractedPeople.length > 0 && (
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-stone-700">Found {extractedPeople.length} people</h3>
            <button 
              onClick={() => setSelectedIndices(selectedIndices.size === extractedPeople.length ? new Set() : new Set(extractedPeople.map((_, i) => i)))}
              className="text-sm text-indigo-600 font-medium"
            >
              {selectedIndices.size === extractedPeople.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-sm p-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {extractedPeople.map((person, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <div 
                    key={idx}
                    onClick={() => toggleSelection(idx)}
                    className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500' : 'border-transparent hover:border-stone-200'}`}
                  >
                    <div className="aspect-square bg-stone-100">
                      <img src={`/api/proxy-image?url=${encodeURIComponent(person.photoUrl)}&base=${encodeURIComponent(url)}`} alt={person.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/fallback/200/200' }} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                      <p className="text-white font-medium text-sm truncate">{person.name}</p>
                    </div>
                    <div className="absolute top-2 right-2">
                      {isSelected ? (
                        <CheckCircle2 className="w-6 h-6 text-indigo-500 bg-white rounded-full" />
                      ) : (
                        <Circle className="w-6 h-6 text-white/80 drop-shadow-md" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={selectedIndices.size === 0 || isImporting}
            className="w-full bg-emerald-600 text-white rounded-2xl py-4 px-4 font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importing ({importProgress}/{selectedIndices.size})...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Import {selectedIndices.size} People
              </>
            )}
          </button>
        </div>
      )}
    </motion.div>
  );
}
