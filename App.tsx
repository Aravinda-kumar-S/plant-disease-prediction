import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { PredictionResult } from './components/PredictionResult';
import { Spinner } from './components/Spinner';
import { analyzePlantImage } from './services/geminiService';
import type { PredictionData, PlantProfile, AnalysisRecord, EnvironmentalData } from './types';
import { usePlantStore } from './hooks/usePlantStore';
import { PlantProfiler } from './components/PlantProfiler';
import { ImageUploader } from './components/ImageUploader';
import { EnvironmentalForm } from './components/EnvironmentalForm';

type View = 'PROFILER' | 'ANALYSIS' | 'RESULT';

const initialEnvironmentalData: EnvironmentalData = {
  sunlight: '',
  watering: '',
  notes: '',
  organicPreference: false,
  location: null,
};

export default function App(): React.ReactNode {
  const { plantProfiles, addPlant, addAnalysisToPlant } = usePlantStore();
  
  const [activePlant, setActivePlant] = useState<PlantProfile | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData>(initialEnvironmentalData);
  
  const [streamingText, setStreamingText] = useState<string>("");
  const [finalPrediction, setFinalPrediction] = useState<AnalysisRecord | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('PROFILER');

  const handleStartAnalysis = (plant: PlantProfile) => {
    resetAnalysisState();
    setActivePlant(plant);
    setCurrentView('ANALYSIS');
  };

  const handleImageUpload = useCallback((file: File) => {
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
  }, []);

  const handleQuickAnalysis = useCallback((file: File) => {
    try {
        const plantName = `New Plant - ${new Date().toLocaleString()}`;
        const newPlant = addPlant(plantName);
        handleImageUpload(file);
        setActivePlant(newPlant);
        setCurrentView('ANALYSIS');
    } catch(e) {
        if(e instanceof Error) setError(e.message);
        else setError("An unexpected error occurred while creating a new plant.");
    }
  }, [addPlant, handleImageUpload]);
  
  const submitAnalysis = useCallback(async () => {
    if (!imageFile || !activePlant) {
      setError("An image and an active plant profile are required.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setFinalPrediction(null);
    setStreamingText("");
    setCurrentView('RESULT');

    let fullResponse = "";
    try {
      const previousAnalysis = activePlant.analysisHistory.length > 0 
        ? activePlant.analysisHistory[activePlant.analysisHistory.length - 1] 
        : undefined;

      const stream = analyzePlantImage(imageFile, environmentalData, previousAnalysis);
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        setStreamingText(prev => prev + chunk);
      }
      
      const parsedData = JSON.parse(fullResponse) as PredictionData;
      const newAnalysisRecord: AnalysisRecord = {
        ...parsedData,
        id: new Date().toISOString(),
        date: new Date().toISOString(),
        imageUrl: URL.createObjectURL(imageFile),
        environmentalData,
      };

      setFinalPrediction(newAnalysisRecord);
      addAnalysisToPlant(activePlant.id, newAnalysisRecord);

    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Failed to parse the AI response. The data might be malformed.");
        console.error("Full response received before parsing error:", fullResponse);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [imageFile, activePlant, environmentalData, addAnalysisToPlant]);

  const resetAnalysisState = () => {
    setImageFile(null);
    setImageUrl(null);
    setFinalPrediction(null);
    setStreamingText("");
    setError(null);
    setIsLoading(false);
    setEnvironmentalData(initialEnvironmentalData);
  };

  const resetToHome = () => {
    resetAnalysisState();
    setActivePlant(null);
    setCurrentView('PROFILER');
  };

  const renderContent = () => {
    switch(currentView) {
      case 'PROFILER':
        return <PlantProfiler 
                  plantProfiles={plantProfiles} 
                  onAddPlant={addPlant} 
                  onStartAnalysis={handleStartAnalysis} 
                  onQuickAnalysis={handleQuickAnalysis}
                />;
      
      case 'ANALYSIS':
        return activePlant && (
          <div className="w-full animate-fade-in">
             <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">New Analysis for <span className="text-emerald-400">{activePlant.name}</span></h2>
                <p className="text-slate-400">Upload a new image and provide any environmental context.</p>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="flex flex-col gap-6">
                <ImageUploader onImageUpload={handleImageUpload} isLoading={isLoading} />
                <EnvironmentalForm data={environmentalData} setData={setEnvironmentalData} />
              </div>
              <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-800 rounded-xl p-4 border border-slate-700">
                {imageUrl ? (
                  <img src={imageUrl} alt="Plant to be analyzed" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <div className="text-center text-slate-400">
                    <p className="font-display text-2xl mb-2">Awaiting Image</p>
                    <p>Your uploaded image will appear here.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-8 flex justify-between items-center gap-4">
               <button onClick={resetToHome} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                  Back to My Plants
                </button>
              <button onClick={submitAnalysis} disabled={!imageFile || isLoading} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors flex-grow">
                {isLoading ? 'Analyzing...' : 'Start Analysis'}
              </button>
            </div>
          </div>
        );

      case 'RESULT':
         return (
          <div className="w-full animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
               <div className="flex flex-col gap-4">
                 <img src={finalPrediction?.imageUrl || imageUrl!} alt="Analyzed plant" className="w-full object-cover rounded-xl border-2 border-slate-700" />
                 <button onClick={resetToHome} className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                   Back to My Plants
                 </button>
               </div>
               <div className="flex flex-col items-center justify-center min-h-[400px] bg-slate-800 rounded-xl p-4 border border-slate-700">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <Spinner />
                    <p className="text-lg text-emerald-300">Analyzing... receiving data now.</p>
                    <pre className="text-left text-xs bg-slate-900 p-2 rounded-md w-full overflow-x-auto h-32 text-slate-400 font-mono">
                        {streamingText}
                        <span className="animate-pulse">|</span>
                    </pre>
                  </div>
                ) : error ? (
                  <div className="text-center text-red-400 p-4 bg-red-900/50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Analysis Failed</h3>
                    <p>{error}</p>
                  </div>
                ) : finalPrediction ? (
                  <PredictionResult prediction={finalPrediction} />
                ) : (
                  <div className="text-center text-slate-400">
                    <p className="font-display text-2xl mb-2">Something went wrong.</p>
                    <p>Could not display analysis result.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center antialiased">
      <Header />
      <main className="w-full max-w-5xl mx-auto p-4 md:p-8 flex-grow flex items-center">
        {renderContent()}
      </main>
      <footer className="w-full text-center p-4 text-slate-500 text-sm">
        <p>Plant Care Companion - Final Year Project Edition</p>
      </footer>
    </div>
  );
}