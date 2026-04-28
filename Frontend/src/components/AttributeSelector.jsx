import { CheckSquare } from 'lucide-react';
import { cn } from './FileUpload';

export function AttributeSelector({ columns, suggestions, selected, onToggle }) {
    if (!columns || columns.length === 0) return null;

    return (
        <div className="mt-10 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold text-slate-800">Select Sensitive Attributes</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
                We've analyzed your column names and highlighted possible sensitive features.
                Please select the attributes you want to protect or analyze for bias.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {columns.map((col) => {
                    const isSuggested = suggestions.includes(col);
                    const isSelected = selected.includes(col);

                    return (
                        <div
                            key={col}
                            onClick={() => onToggle(col)}
                            className={cn(
                                "relative cursor-pointer flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 select-none group",
                                isSelected
                                    ? "border-indigo-600 bg-indigo-50"
                                    : isSuggested
                                        ? "border-amber-200 bg-amber-50/30 hover:border-amber-400"
                                        : "border-slate-100 bg-slate-50 hover:border-slate-300"
                            )}
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className={cn(
                                    "w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                                    isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                                )}>
                                    {isSelected && <CheckSquare size={14} className="stroke-[3]" />}
                                </div>
                                <span className={cn(
                                    "font-medium truncate",
                                    isSelected ? "text-indigo-900" : "text-slate-700"
                                )}>
                                    {col}
                                </span>
                            </div>

                            {isSuggested && (
                                <span className="absolute -top-2.5 -right-2 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shadow-sm">
                                    Suggested
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
