import { useState } from 'react';
import { StepOne } from './components/StepOne';
import { StepTwo } from './components/StepTwo';
import { StepThree } from './components/StepThree';
import { StepFour } from './components/StepFour';
import { ChatWidget } from './components/ChatWidget';
import { parseAndCleanDataset } from './utils/dataUtils';
import { suggestSensitiveAttributes } from './utils/biasUtils';

function App() {
  // Global App State
  const [currentStep, setCurrentStep] = useState(1);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Step 1: Upload & Clean State
  const [datasetFile, setDatasetFile] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [columns, setColumns] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Step 2: Model & Fairness State
  const [selectedModel, setSelectedModel] = useState('rf'); // Default: Random Forest
  const [selectedCriterion, setSelectedCriterion] = useState(null);

  const handleFileSelect = async (file) => {
    setError(null);
    setIsProcessing(true);
    setDatasetFile(null);
    setDataset(null);
    setSelectedAttributes([]);
    
    try {
      setDatasetFile(file);
      const { data, columns: parsedCols } = await parseAndCleanDataset(file);
      setDataset(data);
      setColumns(parsedCols);
      
      const suggested = suggestSensitiveAttributes(parsedCols);
      setSuggestions(suggested);
    } catch (err) {
      setError(err.toString());
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleAttribute = (col) => {
    setSelectedAttributes(prev => 
      prev.includes(col) 
        ? prev.filter(a => a !== col) 
        : [...prev, col]
    );
  };

  const handleStepOneProceed = () => {
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepTwoProceed = () => {
    showToast("Configuration saved. Proceeding to Model Analysis...");
    setCurrentStep(3); 
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50 text-slate-900 font-sans relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl font-medium flex items-center gap-3 border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
            {toast}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-inner">
              <span className="text-white font-bold text-xl leading-none tracking-tighter">Eq</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800">EquiSense <span className="text-indigo-600">AI</span></h1>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        
        {currentStep === 1 && (
          <StepOne 
            dataset={dataset}
            columns={columns}
            suggestions={suggestions}
            selectedAttributes={selectedAttributes}
            error={error}
            isProcessing={isProcessing}
            onFileSelect={handleFileSelect}
            onToggleAttribute={toggleAttribute}
            onProceed={handleStepOneProceed}
          />
        )}

        {currentStep === 2 && (
          <StepTwo 
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            selectedCriterion={selectedCriterion}
            setSelectedCriterion={setSelectedCriterion}
            onBack={() => setCurrentStep(1)}
            onProceed={handleStepTwoProceed}
          />
        )}

        {currentStep === 3 && (
          <StepThree 
            onBack={() => setCurrentStep(2)}
            onProceed={(analysisResults) => {
              console.log("Analysis Results:", analysisResults);
              showToast("Analysis complete. Proceeding to Mitigation & Comparison...");
              setCurrentStep(4);
            }}
            dataset={datasetFile}
            selectedModel={selectedModel}
            selectedCriterion={selectedCriterion}
            selectedAttributes={selectedAttributes}
          />
        )}

        {currentStep === 4 && (
          <StepFour 
            onBack={() => setCurrentStep(3)}
            onRestart={() => setCurrentStep(1)}
            dataset={datasetFile}
            selectedModel={selectedModel}
            selectedCriterion={selectedCriterion}
            selectedAttributes={selectedAttributes}
          />
        )}
      </main>

      {/* Floating Chat Bot Widget */}
      <ChatWidget />
    </div>
  );
}

export default App;
