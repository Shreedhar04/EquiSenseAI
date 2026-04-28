import { BadgeCheck, Info } from 'lucide-react';
import { cn } from './FileUpload';

const MODELS = [
  {
    id: 'lr',
    name: 'Logistic Regression',
    description: 'A simple and interpretable linear model suitable for basic classification tasks.',
    recommended: false
  },
  {
    id: 'rf',
    name: 'Random Forest',
    description: 'An ensemble model that handles complex patterns and reduces overfitting.',
    recommended: true
  },
  {
    id: 'svm',
    name: 'Support Vector Machine (SVM)',
    description: 'Effective for high-dimensional data and clear margin separation.',
    recommended: false
  },
  {
    id: 'xgb',
    name: 'XGBoost',
    description: 'A powerful boosting algorithm known for high performance on structured data.',
    recommended: true
  }
];

export function ModelSelection({ selectedModelId, onModelChange }) {
  const selectedModel = MODELS.find(m => m.id === selectedModelId);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
      <h3 className="text-xl font-bold text-slate-800 mb-2">Select Machine Learning Model</h3>
      <p className="text-slate-500 mb-6 text-sm">Choose the algorithm that will be trained and evaluated for bias.</p>

      <div className="relative">
        <select
          value={selectedModelId}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-900 text-md rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3.5 pr-10 font-medium"
        >
          {MODELS.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} {model.recommended ? '⭐ (Recommended)' : ''}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {selectedModel && (
        <div className="mt-4 p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 flex gap-3 animate-in fade-in">
          <Info className="text-indigo-500 shrink-0 mt-0.5" size={18} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-indigo-900">{selectedModel.name}</span>
              {selectedModel.recommended && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  <BadgeCheck size={12} /> Recommended
                </span>
              )}
            </div>
            <p className="text-sm text-indigo-800/80">{selectedModel.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
