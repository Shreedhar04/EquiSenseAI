import { useState } from 'react';
import { ArrowLeft, ArrowRight, Play, CheckCircle2, AlertTriangle, Activity, BarChart2, ShieldAlert, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { cn } from './FileUpload';

export function StepThree({ 
  onBack, 
  onProceed, 
  dataset, 
  selectedModel, 
  selectedCriterion, 
  selectedAttributes 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  // Local state for dynamically toggling charts
  const [activeFeatures, setActiveFeatures] = useState(
    selectedAttributes.reduce((acc, attr) => ({ ...acc, [attr]: true }), {})
  );

  const toggleFeature = (feature) => {
    setActiveFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const handleTrainModel = async () => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', dataset);
      formData.append('model', selectedModel);
      formData.append('metrics', selectedCriterion);
      formData.append('sensitive', selectedAttributes.join(','));

      const response = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to train model');
      }

      const data = await response.json();
      console.log("Backend Response:", data);
      setResults(data);
    } catch (error) {
      console.error(error);
      alert("Error connecting to backend. Make sure FastAPI is running!");
    } finally {
      setIsLoading(false);
    }
  };

  const modelNames = {
    lr: "Logistic Regression",
    rf: "Random Forest",
    svm: "Support Vector Machine",
    xgb: "XGBoost"
  };

  const metricNames = {
    dp: "Demographic Parity",
    eo: "Equal Opportunity",
    eq_odds: "Equalized Odds"
  };

  // Helper to get charting data for currently checked features
  const getChartData = () => {
    if (!results || !results.group_fairness) return [];
    
    let combinedData = [];
    Object.keys(results.group_fairness).forEach(feature => {
      if (activeFeatures[feature]) {
        const groups = results.group_fairness[feature];
        Object.keys(groups).forEach(groupName => {
          combinedData.push({
            name: `${feature}: ${groupName}`,
            feature: feature,
            posRate: groups[groupName].positive_rate * 100, // convert to %
            tpr: groups[groupName].tpr * 100,
            fpr: groups[groupName].fpr * 100
          });
        });
      }
    });
    return combinedData;
  };

  const chartData = getChartData();
  const fairnessThreshold = 0.1; // Example threshold: 10% difference
  const isFair = results && results.fairness.value <= fairnessThreshold;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500 w-full max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* 1. Header Context */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="text-indigo-600" />
          Model Evaluation & Bias Detection
        </h2>
        
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="font-semibold">Model:</span>
            <span>{modelNames[selectedModel]}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="font-semibold">Metric:</span>
            <span>{metricNames[selectedCriterion]}</span>
          </div>
          <div className="bg-purple-50 border border-purple-100 text-purple-700 px-4 py-2 rounded-xl flex items-center gap-2">
            <span className="font-semibold">Sensitive Attributes:</span>
            <span>{selectedAttributes.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* 2. Train Button / Loading */}
      {!results && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <BarChart2 size={32} className="text-indigo-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Ready to Analyze</h3>
          <p className="text-slate-500 max-w-md mb-8">
            We will now train the {modelNames[selectedModel]} on your dataset and analyze its predictions for bias.
          </p>
          <button
            onClick={handleTrainModel}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Training model and computing metrics...
              </>
            ) : (
              <>
                <Play size={20} fill="currentColor" />
                Train Model & Detect Bias
              </>
            )}
          </button>
        </div>
      )}

      {/* Results Dashboard */}
      {results && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          
          {/* 3. Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard title="Accuracy" value={results.performance.accuracy} icon={<Target size={20} />} />
            <MetricCard title="Precision" value={results.performance.precision} />
            <MetricCard title="Recall" value={results.performance.recall} />
            <MetricCard title="F1 Score" value={results.performance.f1_score} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Charts */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Dynamic Control */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-3">Sensitive Feature Filter</h3>
                <div className="flex gap-4">
                  {selectedAttributes.map(attr => (
                    <label key={attr} className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={activeFeatures[attr]}
                        onChange={() => toggleFeature(attr)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-slate-700">{attr}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Chart 1: Positive Prediction Rate */}
              <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-slate-200", selectedCriterion === "eo" ? "opacity-50" : "")}>
                <h3 className="font-semibold text-slate-800 mb-6">Positive Prediction Rate (%)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                      <Tooltip 
                        cursor={{fill: '#F1F5F9'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        formatter={(val) => [`${val.toFixed(1)}%`, 'Prediction Rate']}
                      />
                      <Bar dataKey="posRate" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: True Positive vs False Positive Rate */}
              <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-slate-200", selectedCriterion === "dp" ? "opacity-50" : "")}>
                <h3 className="font-semibold text-slate-800 mb-6">True Positive vs False Positive Rate (%)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                      <Tooltip 
                        cursor={{fill: '#F1F5F9'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        formatter={(val, name) => [`${val.toFixed(1)}%`, name === 'tpr' ? 'TPR' : 'FPR']}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="tpr" name="True Positive Rate" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="fpr" name="False Positive Rate" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Group-wise Fairness Metrics Table */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-6">Group-wise Fairness Metrics</h3>
                <div className="space-y-8">
                  {results.group_fairness && Object.keys(results.group_fairness).map(feature => {
                    if (!activeFeatures[feature]) return null;
                    const groups = results.group_fairness[feature];
                    return (
                      <div key={feature}>
                        <h4 className="font-semibold text-indigo-700 mb-3 capitalize">Feature: {feature}</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b-2 border-slate-200">
                                <th className="py-2 px-4 text-slate-600 font-semibold">Group</th>
                                <th className="py-2 px-4 text-slate-600 font-semibold">TPR</th>
                                <th className="py-2 px-4 text-slate-600 font-semibold">FPR</th>
                                <th className="py-2 px-4 text-slate-600 font-semibold">Positive Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.keys(groups).map(groupName => (
                                <tr key={groupName} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                  <td className="py-2 px-4 text-slate-800">{groupName}</td>
                                  <td className="py-2 px-4 text-slate-700">{groups[groupName].tpr.toFixed(4)}</td>
                                  <td className="py-2 px-4 text-slate-700">{groups[groupName].fpr.toFixed(4)}</td>
                                  <td className="py-2 px-4 text-slate-700">{groups[groupName].positive_rate.toFixed(4)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column: Fairness Results */}
            <div className="space-y-6">
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <ShieldAlert size={20} className="text-indigo-600" />
                  Fairness Evaluation
                </h3>
                
                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-1">{results.fairness?.metric_name || "Metric"} Difference</p>
                  <p className="text-4xl font-bold text-slate-800">
                    {results.fairness?.value !== undefined && results.fairness?.value !== null ? results.fairness.value.toFixed(4) : "Data not available"}
                  </p>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border flex items-start gap-3",
                  isFair 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                    : "bg-amber-50 border-amber-100 text-amber-800"
                )}>
                  {isFair ? (
                    <CheckCircle2 className="shrink-0 mt-0.5 text-emerald-600" size={20} />
                  ) : (
                    <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={20} />
                  )}
                  <div>
                    <p className="font-semibold text-sm mb-1">
                      {isFair ? "Model is relatively fair" : "Bias detected across groups"}
                    </p>
                    <p className="text-xs opacity-90 leading-relaxed">
                      {isFair 
                        ? `The difference is below our threshold of ${fairnessThreshold}.`
                        : `The model's predictions significantly favor certain groups over others. Mitigation is required.`}
                    </p>
                  </div>
                </div>

                {/* Worst-Case Gaps Section */}
                {results.worst_case && (
                  <div className="mt-8 space-y-4">
                    <h4 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                      Worst-Case Fairness Gaps
                    </h4>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {Object.keys(results.worst_case).map(feature => {
                        if (!activeFeatures[feature]) return null;
                        const summary = results.worst_case[feature];
                        
                        // Find highest gap for highlighting
                        const gaps = [
                          { label: 'TPR', val: summary.tpr_diff },
                          { label: 'FPR', val: summary.fpr_diff },
                          { label: 'DP', val: summary.demographic_parity_diff }
                        ];
                        const highest = Math.max(...gaps.map(g => g.val));

                        return (
                          <div key={feature} className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                            <div className="font-semibold text-indigo-700 mb-3 capitalize flex items-center justify-between">
                              <span>{feature}</span>
                            </div>
                            <div className="flex flex-col gap-3">
                              
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600 font-medium">TPR Difference:</span>
                                <span className={cn(
                                  "font-bold px-2 py-0.5 rounded",
                                  summary.tpr_diff === highest && highest > 0 ? "bg-red-100 text-red-700" : "text-slate-800"
                                )}>
                                  {(summary.tpr_diff * 100).toFixed(1)}%
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600 font-medium">FPR Difference:</span>
                                <span className={cn(
                                  "font-bold px-2 py-0.5 rounded",
                                  summary.fpr_diff === highest && highest > 0 ? "bg-red-100 text-red-700" : "text-slate-800"
                                )}>
                                  {(summary.fpr_diff * 100).toFixed(1)}%
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                <span className="text-slate-600 font-medium">Demographic Parity Diff:</span>
                                <span className={cn(
                                  "font-bold px-2 py-0.5 rounded",
                                  summary.demographic_parity_diff === highest && highest > 0 ? "bg-red-100 text-red-700" : "text-slate-800"
                                )}>
                                  {(summary.demographic_parity_diff * 100).toFixed(1)}%
                                </span>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-slate-200">
            <button
              onClick={onBack}
              className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              onClick={() => onProceed(results)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium transition-all hover:scale-105 flex items-center gap-2 shadow-sm"
            >
              Next: Bias Mitigation
              <ArrowRight size={18} />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between h-28">
      <div className="flex justify-between items-start text-slate-500 mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-800">
        {(value * 100).toFixed(1)}%
      </p>
    </div>
  );
}
