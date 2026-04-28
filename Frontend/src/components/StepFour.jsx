import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, ArrowLeft, Code, TrendingUp, AlertTriangle, CheckCircle2, PlayCircle, Cloud, Server, RefreshCw, Key, Copy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Scatter, ScatterChart, ZAxis } from 'recharts';

export function StepFour({ onBack, dataset, selectedModel, selectedCriterion, selectedAttributes, onRestart }) {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("Baseline");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployData, setDeployData] = useState(null);
  const [deployCloud, setDeployCloud] = useState(true);
  const [inferenceInput, setInferenceInput] = useState("");
  const [inferenceResult, setInferenceResult] = useState(null);
  const [isInferencing, setIsInferencing] = useState(false);

  const handleDeploy = async () => {
    try {
      setIsDeploying(true);
      const formData = new FormData();
      formData.append("file", dataset);
      formData.append("model", selectedModel);
      formData.append("metrics", selectedCriterion);
      formData.append("sensitive", selectedAttributes.join(','));
      formData.append("method", selectedMethod);

      const res = await fetch("http://127.0.0.1:8000/generate-api", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Deployment failed");
      const data = await res.json();
      setDeployData(data);
      
      // Auto-generate a dummy JSON payload based on input_format
      if (data.input_format) {
        Object.keys(data.input_format).forEach(k => {
          dummy[k] = data.input_format[k] === "number/string" ? 0 : ""; 
        });
        setInferenceInput(JSON.stringify(dummy, null, 2));
      }
    } catch (err) {
      alert("Error deploying: " + err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleInference = async () => {
    try {
      setIsInferencing(true);
      const payload = JSON.parse(inferenceInput);
      const res = await fetch(deployData.endpoint_url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${deployData.api_key}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setInferenceResult(data);
    } catch (err) {
      setInferenceResult({ error: err.message });
    } finally {
      setIsInferencing(false);
    }
  };

  useEffect(() => {
    const mitigate = async () => {
      try {
        setIsProcessing(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", dataset);
        formData.append("model", selectedModel);
        formData.append("metrics", selectedCriterion);
        formData.append("sensitive", selectedAttributes.join(','));

        const res = await fetch("http://127.0.0.1:8000/mitigate", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText);
        }

        const data = await res.json();
        setResults(data.results);
        setRecommendation(data.recommendation);
        setSelectedMethod(data.recommendation || "Baseline");
      } catch (err) {
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    };

    if (dataset) {
      mitigate();
    }
  }, [dataset, selectedModel, selectedCriterion, selectedAttributes]);

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 w-6 h-6" />
        </div>
        <h3 className="mt-6 text-xl font-bold text-slate-800">Applying Bias Mitigation...</h3>
        <p className="mt-2 text-slate-500 max-w-md text-center">
          EquiSense is training multiple models using Reweighing and Threshold Optimization to find the fairest outcome. This may take up to 30 seconds.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100 flex flex-col items-center text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold mb-2">Mitigation Failed</h3>
        <p className="text-sm opacity-80">{error}</p>
        <button onClick={onBack} className="mt-6 px-6 py-2 bg-white text-red-600 rounded-lg font-medium shadow-sm hover:bg-red-50 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  if (!results) return null;

  const currentData = results[selectedMethod];
  if (!currentData) return null;

  // Prepare data for the Method Comparison Graph (TPR vs FPR scatter plot)
  const scatterData = [];
  const colors = {
    "Baseline": "#94a3b8", // slate-400
    "Reweighing": "#3b82f6", // blue-500
    "Threshold Optimization": "#8b5cf6", // violet-500
    "Reweighing + Threshold Optimization": "#10b981" // emerald-500
  };

  Object.keys(results).forEach(methodName => {
    const methodResults = results[methodName];
    // We'll plot points for the first sensitive feature to keep it simple, or all.
    // Let's plot points for all groups across all sensitive features for this method.
    Object.keys(methodResults.group_fairness).forEach(feature => {
      Object.keys(methodResults.group_fairness[feature]).forEach(group => {
        scatterData.push({
          method: methodName,
          group: `${feature}: ${group}`,
          tpr: methodResults.group_fairness[feature][group].tpr,
          fpr: methodResults.group_fairness[feature][group].fpr,
        });
      });
    });
  });

  const getMetricLabel = () => {
    if (selectedCriterion === 'dp') return 'DP Difference';
    if (selectedCriterion === 'eo') return 'TPR Difference';
    return 'Max Gap (TPR/FPR)';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Bias Mitigation & Comparison</h2>
          <p className="text-slate-500 mt-1">Compare how different techniques affect model fairness and performance.</p>
        </div>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium shadow-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Recommended Method Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
            <CheckCircle2 size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Recommended Method: {recommendation}</h3>
            <p className="text-emerald-50 text-sm mt-1 max-w-2xl">
              This method achieves the best improvement in {getMetricLabel()} while maintaining an acceptable F1 score drop (&lt; 5%) compared to the baseline.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setSelectedMethod(recommendation)}
          className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm ${selectedMethod === recommendation ? 'bg-white text-emerald-600' : 'bg-emerald-600/50 text-white hover:bg-emerald-600'}`}
        >
          {selectedMethod === recommendation ? 'Selected' : 'Select Recommended'}
        </button>
      </div>

      {/* Method Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(results).map(method => (
          <button
            key={method}
            onClick={() => setSelectedMethod(method)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all border ${
              selectedMethod === method 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-indigo-300'
            }`}
          >
            {method} {method === recommendation && '✨'}
          </button>
        ))}
      </div>

      {/* Performance & Fairness Cards for Selected Method */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Accuracy</p>
          <p className="text-2xl font-black text-slate-800">
            {(currentData.performance.accuracy * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Precision</p>
          <p className="text-2xl font-black text-slate-800">
            {(currentData.performance.precision * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Recall</p>
          <p className="text-2xl font-black text-slate-800">
            {(currentData.performance.recall * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 border-r-4 border-r-indigo-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">F1 Score</p>
          <p className="text-2xl font-black text-slate-800">
            {(currentData.performance.f1_score * 100).toFixed(1)}%
          </p>
        </div>
        
        {/* Fairness Value */}
        <div className="bg-indigo-50 p-5 rounded-2xl shadow-sm border border-indigo-100 flex flex-col justify-center">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">{getMetricLabel()}</p>
          <p className="text-2xl font-black text-indigo-700">
            {currentData.fairness.value.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Method Comparison Graph */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-800">Method Comparison: TPR vs FPR</h3>
          <p className="text-sm text-slate-500">Visualizing group outcomes across all mitigation techniques. Ideal fairness is clustered points.</p>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis type="number" dataKey="fpr" name="False Positive Rate" domain={[0, 1]} tick={{fill: '#64748b'}} tickLine={false} axisLine={{stroke: '#cbd5e1'}} />
              <YAxis type="number" dataKey="tpr" name="True Positive Rate" domain={[0, 1]} tick={{fill: '#64748b'}} tickLine={false} axisLine={{stroke: '#cbd5e1'}} />
              <ZAxis type="category" dataKey="group" name="Group" />
              <RechartsTooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              <Legend wrapperStyle={{paddingTop: '20px'}} />
              
              {Object.keys(results).map((method) => (
                <Scatter 
                  key={method} 
                  name={method} 
                  data={scatterData.filter(d => d.method === method)} 
                  fill={colors[method]} 
                  shape="circle"
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Group-Wise Fairness (Before vs After) */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Group-Wise Impact: Before vs After</h3>
        
        {selectedAttributes.map(feature => {
          const baselineGroups = results["Baseline"].group_fairness[feature];
          const currentGroups = currentData.group_fairness[feature];
          if (!baselineGroups || !currentGroups) return null;

          return (
            <div key={feature} className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <h4 className="font-bold text-slate-700 capitalize flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-500" /> Feature: {feature}
              </h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Before Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-100 py-3 px-5 border-b border-slate-200">
                    <h5 className="font-bold text-slate-700 text-sm">Baseline (Before)</h5>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                          <th className="px-5 py-3">Group</th>
                          <th className="px-5 py-3">TPR</th>
                          <th className="px-5 py-3">FPR</th>
                          <th className="px-5 py-3">Pos Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.keys(baselineGroups).map(group => (
                          <tr key={group} className="hover:bg-slate-50">
                            <td className="px-5 py-3 font-medium text-slate-700">{group}</td>
                            <td className="px-5 py-3 text-slate-600">{baselineGroups[group].tpr.toFixed(3)}</td>
                            <td className="px-5 py-3 text-slate-600">{baselineGroups[group].fpr.toFixed(3)}</td>
                            <td className="px-5 py-3 text-slate-600">{baselineGroups[group].positive_rate.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* After Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden ring-1 ring-indigo-500/10">
                  <div className="bg-indigo-50 py-3 px-5 border-b border-indigo-100">
                    <h5 className="font-bold text-indigo-800 text-sm">{selectedMethod} (After)</h5>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-indigo-50/30 text-indigo-600 text-xs uppercase font-semibold">
                        <tr>
                          <th className="px-5 py-3">Group</th>
                          <th className="px-5 py-3">TPR</th>
                          <th className="px-5 py-3">FPR</th>
                          <th className="px-5 py-3">Pos Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.keys(currentGroups).map(group => {
                          const base = baselineGroups[group];
                          const curr = currentGroups[group];
                          
                          // Helpers to show improvement direction visually (higher TPR is good, unless it increases gap, but simple diff for now)
                          const getTrend = (b, c) => {
                            if (c > b) return <TrendingUp size={12} className="inline text-emerald-500 ml-1" />;
                            if (c < b) return <TrendingUp size={12} className="inline text-rose-500 ml-1 rotate-180" />;
                            return null;
                          };

                          return (
                            <tr key={group} className="hover:bg-indigo-50/50">
                              <td className="px-5 py-3 font-medium text-slate-700">{group}</td>
                              <td className="px-5 py-3 text-slate-600">{curr.tpr.toFixed(3)} {getTrend(base.tpr, curr.tpr)}</td>
                              <td className="px-5 py-3 text-slate-600">{curr.fpr.toFixed(3)} {getTrend(base.fpr, curr.fpr)}</td>
                              <td className="px-5 py-3 text-slate-600">{curr.positive_rate.toFixed(3)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Final Actions / Deployment */}
      <div className="pt-8 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Deploy Model as API</h3>
            <p className="text-sm text-slate-500">Generate a standalone FastAPI wrapper for the debiased model.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
              <input type="checkbox" checked={deployCloud} onChange={e => setDeployCloud(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
              Deploy to Cloud (Free Tier)
            </label>
            <button 
              onClick={handleDeploy}
              disabled={isDeploying}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95 shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {isDeploying ? <Loader2 className="animate-spin" size={18} /> : <Key size={18} />}
              {isDeploying ? 'Deploying...' : 'Generate API Key & Endpoint'}
            </button>
            <button 
              onClick={onRestart}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <RefreshCw size={18} /> Restart Analysis
            </button>
          </div>
        </div>

        {deployData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* API Details Panel */}
            <div className="bg-slate-900 rounded-2xl p-6 text-slate-300 font-mono text-sm shadow-xl border border-slate-700">
              <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <Server size={18} />
                <span className="font-bold">Deployment Successful</span>
                <span className="ml-auto text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">Status: {deployData.status}</span>
              </div>
              <p className="mb-2"><span className="text-indigo-400">URL:</span> {deployData.endpoint_url}</p>
              <p className="mb-4"><span className="text-indigo-400">Method:</span> {deployData.method}</p>
              <p className="text-slate-400 mb-1">{"// Sample Request Schema"}</p>
              <pre className="bg-slate-950 p-4 rounded-xl overflow-x-auto text-emerald-300">
                {JSON.stringify(deployData.input_format, null, 2)}
              </pre>
              <p className="mt-4 text-xs text-slate-500 bg-slate-800/50 p-2 rounded">
                Note: This is a demo API. Do not use sensitive data in public endpoints.
              </p>
            </div>

            {/* Inference Panel */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
              <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <PlayCircle className="text-indigo-500" size={18} /> Live Inference Testing
              </h4>
              <p className="text-sm text-slate-500 mb-4">Edit the JSON payload below and click predict to test the API.</p>
              
              <textarea 
                value={inferenceInput}
                onChange={e => setInferenceInput(e.target.value)}
                className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm mb-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                spellCheck="false"
              />
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleInference}
                  disabled={isInferencing}
                  className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isInferencing ? <Loader2 className="animate-spin" size={16} /> : "Send Request"}
                </button>
                
                {inferenceResult && (
                  <div className="flex-1 bg-indigo-50 text-indigo-800 px-4 py-2 rounded-lg border border-indigo-100 font-mono text-sm">
                    {JSON.stringify(inferenceResult)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
