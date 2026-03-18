import React, { useState, useEffect, useRef } from 'react';
import { getPeople, updatePerson, Person } from '../lib/db';
import { calculateSM2 } from '../lib/sm2';
import { transcribeAudio } from '../lib/gemini';
import { Mic, Volume2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Review({ onNavigate, practiceAllMode = false }: { onNavigate: (view: any) => void, key?: string, practiceAllMode?: boolean }) {
  const [queue, setQueue] = useState<Person[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechResult, setSpeechResult] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    const allPeople = await getPeople();
    
    if (practiceAllMode) {
      allPeople.sort(() => Math.random() - 0.5);
      setQueue(allPeople);
    } else {
      const now = Date.now();
      const due = allPeople.filter(p => p.nextReviewDate <= now);
      // Shuffle queue
      due.sort(() => Math.random() - 0.5);
      setQueue(due);
    }
  };

  const currentPerson = queue[currentIndex];

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
        // Try to decode as standard audio (WAV/MP3) first
        const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
      } catch (e) {
        // If it fails, it's likely raw 16-bit PCM at 24000Hz from Gemini TTS
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

  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const handleReveal = async () => {
    setShowAnswer(true);
    if (currentPerson?.audioData) {
      playAudio(currentPerson.audioData);
    } else if (currentPerson) {
      // Generate missing audio
      setIsGeneratingAudio(true);
      try {
        const { generatePronunciation } = await import('../lib/gemini');
        const audioData = await generatePronunciation(currentPerson.name);
        if (audioData) {
          const updatedPerson = { ...currentPerson, audioData };
          await updatePerson(updatedPerson);
          
          // Update queue so it reflects the new audioData
          setQueue(prev => {
            const newQueue = [...prev];
            newQueue[currentIndex] = updatedPerson;
            return newQueue;
          });
          
          playAudio(audioData);
        }
      } catch (e) {
        console.error("Failed to generate missing audio:", e);
      } finally {
        setIsGeneratingAudio(false);
      }
    }
  };

  const handleRate = async (quality: number) => {
    if (!currentPerson) return;
    
    const updatedPerson = calculateSM2(quality, currentPerson);
    await updatePerson(updatedPerson);

    setCurrentIndex(prev => prev + 1);
    setShowAnswer(false);
    setSpeechResult(null);
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleListening = async () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        stream.getTracks().forEach(track => track.stop());
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          setSpeechResult("Transcribing...");
          const transcript = await transcribeAudio(base64data, mediaRecorder.mimeType);
          
          if (transcript) {
            setSpeechResult(transcript);
            
            // Simple matching logic
            const spokenWords = transcript.toLowerCase().split(/\s+/);
            const nameWords = currentPerson.name.toLowerCase().split(/\s+/);
            
            const isMatch = nameWords.some(word => spokenWords.includes(word)) || 
                            transcript.toLowerCase().includes(currentPerson.name.toLowerCase());

            if (isMatch) {
              handleReveal();
            }
          } else {
            setSpeechResult("Could not transcribe audio.");
          }
        };
      };

      mediaRecorder.start();
      setIsListening(true);
      setSpeechResult("Listening... Tap again to stop.");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access was denied or is not available. Please check your browser settings.");
    }
  };

  const practiceAll = async () => {
    const allPeople = await getPeople();
    if (allPeople.length === 0) {
      alert("You haven't added anyone yet!");
      return;
    }
    allPeople.sort(() => Math.random() - 0.5);
    setQueue(allPeople);
    setCurrentIndex(0);
    setShowAnswer(false);
    setSpeechResult(null);
  };

  if (queue.length === 0 || currentIndex >= queue.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] text-center px-4">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-semibold text-stone-800 mb-2">All Caught Up!</h2>
        <p className="text-stone-500 mb-8 text-lg">You've finished your review session.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={practiceAll}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Review Again (Shuffled)
          </button>
          <button 
            onClick={() => onNavigate('dashboard')}
            className="bg-white border border-stone-200 shadow-sm text-stone-700 px-8 py-4 rounded-2xl font-semibold hover:bg-stone-50 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] pb-4 pt-2">
      <div className="flex justify-between items-center mb-6 text-sm font-medium text-stone-500 px-2">
        <span className="bg-stone-200/50 px-3 py-1 rounded-full">Reviewing {currentIndex + 1} of {queue.length}</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setCurrentIndex(0);
              setShowAnswer(false);
              setSpeechResult(null);
            }} 
            className="text-stone-500 hover:text-stone-800 transition-colors flex items-center gap-1 bg-stone-200/50 px-3 py-1 rounded-full text-xs font-medium"
            title="Restart Review"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>
          <button onClick={() => onNavigate('dashboard')} className="text-stone-400 hover:text-stone-600 transition-colors" title="Close">
            <XCircle className="w-7 h-7" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPerson.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <div className="w-72 h-72 rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white mb-8 bg-stone-100">
              <img 
                src={currentPerson.photoData} 
                alt="Person" 
                className="w-full h-full object-cover"
              />
            </div>

            {!showAnswer ? (
              <div className="w-full flex flex-col items-center gap-6 px-4">
                <div className="flex flex-col items-center gap-3 h-32 justify-center">
                  <button
                    onClick={toggleListening}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse scale-110' 
                        : 'bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Mic className={`w-8 h-8 ${isListening ? 'animate-bounce' : ''}`} />
                  </button>
                  {speechResult ? (
                    <p className="text-sm text-stone-600 italic font-medium">"{speechResult}"</p>
                  ) : (
                    <p className="text-stone-400 text-sm font-medium">Tap mic to say their name</p>
                  )}
                </div>
                
                <button
                  onClick={handleReveal}
                  className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Show Answer
                </button>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex flex-col items-center px-4"
              >
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-4xl font-bold text-stone-800 tracking-tight">{currentPerson.name}</h2>
                  {currentPerson.audioData ? (
                    <button 
                      onClick={() => playAudio(currentPerson.audioData)}
                      className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-colors shadow-sm"
                    >
                      <Volume2 className="w-6 h-6" />
                    </button>
                  ) : isGeneratingAudio ? (
                    <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center shadow-sm">
                      <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : null}
                </div>

                <p className="text-sm font-semibold text-stone-500 mb-4 w-full text-left ml-2">How well did you remember?</p>
                <div className="grid grid-cols-4 gap-3 w-full">
                  <button onClick={() => handleRate(0)} className="bg-red-50 hover:bg-red-100 text-red-700 py-4 rounded-2xl font-semibold text-sm transition-colors shadow-sm">
                    Forgot
                  </button>
                  <button onClick={() => handleRate(3)} className="bg-orange-50 hover:bg-orange-100 text-orange-700 py-4 rounded-2xl font-semibold text-sm transition-colors shadow-sm">
                    Hard
                  </button>
                  <button onClick={() => handleRate(4)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-4 rounded-2xl font-semibold text-sm transition-colors shadow-sm">
                    Good
                  </button>
                  <button onClick={() => handleRate(5)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-4 rounded-2xl font-semibold text-sm transition-colors shadow-sm">
                    Easy
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
