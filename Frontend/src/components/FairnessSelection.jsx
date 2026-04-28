import { Scale, Users, LineChart, BadgeCheck } from 'lucide-react';
import { cn } from './FileUpload';

const CRITERIA = [
  {
    id: 'dp',
    name: 'Demographic Parity',
    description: 'Ensures equal probability of positive outcomes across all groups, regardless of actual labels.',
    icon: Users,
    color: 'emerald',
    recommended: false
  },
  {
    id: 'eo',
    name: 'Equal Opportunity',
    description: 'Ensures equal true positive rates across different groups (people who deserve a positive outcome get one equally).',
    icon: Scale,
    color: 'blue',
    recommended: false
  },
  {
    id: 'eq_odds',
    name: 'Equalized Odds',
    description: 'Ensures both equal true positive rates and equal false positive rates across all sensitive groups.',
    icon: LineChart,
    color: 'purple',
    recommended: true
  }
];

export function FairnessSelection({ selectedCriteriaId, onCriteriaChange }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
      <h3 className="text-xl font-bold text-slate-800 mb-2">Select Fairness Criterion</h3>
      <p className="text-slate-500 mb-6 text-sm">Choose the primary definition of fairness you wish to enforce on the model.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CRITERIA.map(crit => {
          const isSelected = selectedCriteriaId === crit.id;
          const Icon = crit.icon;
          
          return (
            <div
              key={crit.id}
              onClick={() => onCriteriaChange(crit.id)}
              className={cn(
                "cursor-pointer p-5 rounded-xl border-2 transition-all duration-200 flex flex-col group",
                isSelected 
                  ? "border-indigo-600 bg-indigo-50/50 shadow-md ring-4 ring-indigo-500/10" 
                  : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                )}>
                  <Icon size={20} />
                </div>
                <div className="flex flex-col">
                  <h4 className={cn(
                    "font-bold transition-colors flex items-center gap-2",
                    isSelected ? "text-indigo-900" : "text-slate-800"
                  )}>
                    {crit.name}
                  </h4>
                  {crit.recommended && (
                    <span className="flex items-center gap-1 text-[10px] w-fit mt-1 font-bold uppercase tracking-wider bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      <BadgeCheck size={12} /> Recommended
                    </span>
                  )}
                </div>
              </div>
              <p className={cn(
                "text-sm leading-relaxed",
                isSelected ? "text-indigo-800/80 font-medium" : "text-slate-500"
              )}>
                {crit.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
