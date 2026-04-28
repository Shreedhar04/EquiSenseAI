import { AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from './FileUpload';
import { FileUpload } from './FileUpload';
import { DataPreview } from './DataPreview';
import { AttributeSelector } from './AttributeSelector';
import { ProgressStep } from './ProgressStep';

export function StepOne({
  dataset,
  columns,
  suggestions,
  selectedAttributes,
  error,
  isProcessing,
  onFileSelect,
  onToggleAttribute,
  onProceed
}) {
  const proceedDisabled = !dataset || selectedAttributes.length === 0;

  const handleLoadDemo = async () => {
    try {
      // Create a simulated file object from the static dataset
      const res = await fetch('/adult_processed.csv');
      if (!res.ok) throw new Error("Could not load demo dataset. Make sure adult_processed.csv is in the public folder.");
      const blob = await res.blob();
      const file = new File([blob], 'demo_dataset.csv', { type: 'text/csv' });
      onFileSelect(file);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <ProgressStep title="Dataset Configuration" step={1} totalSteps={3} />

      {/* Upload Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Data</h2>
        <p className="text-slate-500">Provide the dataset you want to evaluate for bias.</p>
        
        <FileUpload onFileSelect={onFileSelect} />

        <div className="mt-6 flex flex-col items-center">
          <p className="text-sm text-slate-400 mb-3 text-center">Don't have a dataset ready?</p>
          <button 
            onClick={handleLoadDemo}
            disabled={isProcessing}
            className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-semibold px-5 py-2.5 rounded-lg border border-indigo-200 transition-colors disabled:opacity-50"
          >
            Load Demo Dataset
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 text-red-700 flex items-start gap-3 border border-red-100">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {isProcessing && (
          <div className="mt-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </section>

      {/* Preview Section */}
      {dataset && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <DataPreview data={dataset} columns={columns} />
          
          <AttributeSelector 
            columns={columns}
            suggestions={suggestions}
            selected={selectedAttributes}
            onToggle={onToggleAttribute}
          />

          {/* Actions */}
          <div className="mt-12 flex justify-end">
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
              Next Step: Select Model
              <ArrowRight size={20} />
            </button>
          </div>
        </section>
      )}
    </>
  );
}
