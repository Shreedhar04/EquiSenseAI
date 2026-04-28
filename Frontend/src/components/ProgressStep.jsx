export function ProgressStep({ title, step, totalSteps = 3 }) {
    return (
        <div className="flex flex-col items-center mb-8">
            <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase mb-2">Step {step} of {totalSteps}</p>
            <h2 className="text-3xl font-extrabold text-slate-900">{title}</h2>
            {/* Visual Indicator */}
            <div className="flex items-center gap-2 mt-4">
                {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${i + 1 === step ? 'w-8 bg-indigo-600' : i + 1 < step ? 'w-4 bg-indigo-300' : 'w-4 bg-slate-200'}`}
                    />
                ))}
            </div>
        </div>
    );
}
