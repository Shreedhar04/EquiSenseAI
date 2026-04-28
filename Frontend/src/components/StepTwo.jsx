import { ArrowRight } from 'lucide-react';
import { ModelSelection } from './ModelSelection';
import { FairnessSelection } from './FairnessSelection';
import { ProgressStep } from './ProgressStep';
import { cn } from './FileUpload';

export function StepTwo({ 
  selectedModel, 
  setSelectedModel, 
  selectedCriterion, 
  setSelectedCriterion, 
  onBack, 
  onProceed 
}) {
  const proceedDisabled = !selectedModel || !selectedCriterion;

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
      <ProgressStep title="Model & Metric Selection" step={2} totalSteps={3} />

      <ModelSelection 
        selectedModelId={selectedModel} 
        onModelChange={setSelectedModel} 
      />

      <FairnessSelection 
        selectedCriteriaId={selectedCriterion} 
        onCriteriaChange={setSelectedCriterion} 
      />

      {/* Actions */}
      <div className="mt-12 flex justify-between items-center">
        <button 
          onClick={onBack}
          className="text-slate-500 font-medium hover:text-slate-800 transition-colors px-4 py-2"
        >
          ← Back to Dataset
        </button>
        <button 
          onClick={onProceed}
          disabled={proceedDisabled}
          className={cn(
            "flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all shadow-md",
            proceedDisabled 
              ? "bg-slate-300 cursor-not-allowed shadow-none" 
              : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          )}
        >
          Next Step: Analysis
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
