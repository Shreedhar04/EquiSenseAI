from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import pandas as pd
import io
import uuid
import os
import joblib
import tempfile

from processdata import process_dataset
from models import choosemodel
from modelperformacemetrics import model_performance
from fairnessmetricsm import prepare_fairness_df, evaluate_fairness
from debiasing import preprocess_sensitive_features

app = FastAPI()

# Global states for single API deployment
VALID_API_KEYS = set()
DEPLOYED_MODEL = None
SAMPLE_INPUTS = {}
security = HTTPBearer()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://equisenseai2026.web.app",
        "https://equisenseai2026.firebaseapp.com",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_class=HTMLResponse)
async def root():
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>EquiSense AI Backend</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #0f172a;
                color: #f8fafc;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                text-align: center;
            }
            .container {
                background: rgba(30, 41, 59, 0.7);
                padding: 3rem 4rem;
                border-radius: 1rem;
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
                max-width: 600px;
                animation: fadeIn 1s ease-out;
            }
            h1 {
                margin-top: 0;
                font-size: 2.5rem;
                background: linear-gradient(to right, #38bdf8, #818cf8);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 1rem;
            }
            p {
                color: #94a3b8;
                font-size: 1.1rem;
                line-height: 1.6;
                margin-bottom: 2rem;
            }
            .status {
                display: inline-flex;
                align-items: center;
                background: rgba(16, 185, 129, 0.1);
                color: #34d399;
                padding: 0.5rem 1rem;
                border-radius: 9999px;
                font-weight: 500;
                font-size: 0.9rem;
            }
            .status-dot {
                width: 8px;
                height: 8px;
                background-color: #34d399;
                border-radius: 50%;
                margin-right: 8px;
                box-shadow: 0 0 8px #34d399;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.2); }
                100% { opacity: 1; transform: scale(1); }
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>EquiSense AI</h1>
            <p>The backend API for your unbiased AI decision-making platform is successfully running. It is ready to process datasets, analyze fairness metrics, and mitigate bias.</p>
            <div class="status">
                <span class="status-dot"></span> System Online
            </div>
        </div>
    </body>
    </html>
    """
    return html_content
@app.post("/analyze")
async def analyze_dataset(
    file: UploadFile = File(...),
    model: str = Form(...),
    metrics: str = Form(...),
    sensitive: str = Form(...)
):
    try:
        # 1. Load Data
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # 2. Process
        df = process_dataset(df, verbose=False)
        target_col = df.columns[-1] # Defaulting to last column based on processdata.py
        
        # 3. Model mapping
        mapping_models = {
            'lr': 'logistic',
            'rf': 'random_forest',
            'svm': 'svm',
            'xgb': 'xgboost'
        }
        model_name = mapping_models.get(model, 'random_forest')
        
        # 4. Train
        print(f"Starting analysis for model: {model_name}...")
        clf, X_train, X_test, y_train, y_test, y_pred = choosemodel(df, target_col, model_name)
        print(f"Model {model_name} trained successfully.")
        
        # 5. Performance
        perf = model_performance(y_test, y_pred, verbose=False)
        
        # 6. Fairness Configuration
        sensitive_features = [s.strip() for s in sensitive.split(",")]
        
        mapping_criteria = {
            'dp': 'demographic_parity',
            'eo': 'equal_opportunity',
            'eq_odds': 'equalized_odds'
        }
        criteria = [mapping_criteria.get(metrics, 'demographic_parity')]
        
        # 7. Evaluate Fairness
        fair_df = prepare_fairness_df(X_test, y_test, y_pred, target_col)
        fair_df = preprocess_sensitive_features(fair_df, sensitive_features)
        fair_results = evaluate_fairness(fair_df, sensitive_features, target_col, "pred", criteria)
        
        # Format the specific JSON output the frontend needs
        group_fairness = {}
        worst_case = {}
        fairness_val = 0.0
        
        for feature, res in fair_results.items():
            metrics_list = res["table"].to_dict(orient="records")
            group_fairness[feature] = {}
            
            for row in metrics_list:
                group_fairness[feature][str(row["group"])] = {
                    "tpr": float(row.get("TPR", 0.0)),
                    "fpr": float(row.get("FPR", 0.0)),
                    "positive_rate": float(row.get("Demographic_Parity", 0.0))
                }
            
            summary = res["summary"]
            worst_case[feature] = {
                "tpr_diff": float(summary.get("TPR_diff", 0.0)),
                "fpr_diff": float(summary.get("FPR_diff", 0.0)),
                "demographic_parity_diff": float(summary.get("DP_diff", 0.0))
            }
            
            # Extract main fairness metric based on the selected criteria
            if fairness_val == 0.0:
                if metrics == "dp":
                    fairness_val = worst_case[feature]["demographic_parity_diff"]
                elif metrics == "eo":
                    fairness_val = worst_case[feature]["tpr_diff"]
                elif metrics == "eq_odds":
                    # For equalized odds, we could take max of TPR and FPR diff, or just average. 
                    # Usually it's the max difference.
                    fairness_val = max(worst_case[feature]["tpr_diff"], worst_case[feature]["fpr_diff"])
                else:
                    fairness_val = worst_case[feature]["demographic_parity_diff"]

        return {
            "performance": {
                "accuracy": perf.get("accuracy", 0),
                "precision": perf.get("precision", 0),
                "recall": perf.get("recall", 0),
                "f1_score": perf.get("f1", 0)
            },
            "fairness": {
                "metric_name": criteria[0],
                "value": float(fairness_val)
            },
            "group_fairness": group_fairness,
            "worst_case": worst_case
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mitigate")
async def mitigate_dataset(
    file: UploadFile = File(...),
    model: str = Form(...),
    metrics: str = Form(...),
    sensitive: str = Form(...)
):
    try:
        # Load Data
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        df = process_dataset(df, verbose=False)
        target_col = df.columns[-1]
        
        # Mapping
        mapping_models = {
            'lr': 'logistic',
            'rf': 'random_forest',
            'svm': 'svm',
            'xgb': 'xgboost'
        }
        model_name = mapping_models.get(model, 'random_forest')
        
        sensitive_features = [s.strip() for s in sensitive.split(",")]
        mapping_criteria = {
            'dp': 'demographic_parity',
            'eo': 'equal_opportunity',
            'eq_odds': 'equalized_odds'
        }
        criteria_list = [mapping_criteria.get(metrics, 'demographic_parity')]

        # Helper function to evaluate and package results
        def eval_and_package(y_pred_test, X_test_df, y_test_df):
            perf = model_performance(y_test_df, y_pred_test, verbose=False)
            fair_df = prepare_fairness_df(X_test_df, y_test_df, y_pred_test, target_col)
            fair_df = preprocess_sensitive_features(fair_df, sensitive_features)
            fair_results = evaluate_fairness(fair_df, sensitive_features, target_col, "pred", criteria_list)
            
            group_fairness = {}
            worst_case = {}
            fairness_val = 0.0
            
            for feature, res in fair_results.items():
                metrics_list = res["table"].to_dict(orient="records")
                group_fairness[feature] = {}
                
                for row in metrics_list:
                    group_fairness[feature][str(row["group"])] = {
                        "tpr": float(row.get("TPR", 0.0)),
                        "fpr": float(row.get("FPR", 0.0)),
                        "positive_rate": float(row.get("Demographic_Parity", 0.0))
                    }
                
                summary = res["summary"]
                worst_case[feature] = {
                    "tpr_diff": float(summary.get("TPR_diff", 0.0)),
                    "fpr_diff": float(summary.get("FPR_diff", 0.0)),
                    "demographic_parity_diff": float(summary.get("DP_diff", 0.0))
                }
                
                if fairness_val == 0.0:
                    if metrics == "dp":
                        fairness_val = worst_case[feature]["demographic_parity_diff"]
                    elif metrics == "eo":
                        fairness_val = worst_case[feature]["tpr_diff"]
                    else:
                        fairness_val = max(worst_case[feature]["tpr_diff"], worst_case[feature]["fpr_diff"])
            
            return {
                "performance": {
                    "accuracy": perf.get("accuracy", 0),
                    "precision": perf.get("precision", 0),
                    "recall": perf.get("recall", 0),
                    "f1_score": perf.get("f1", 0)
                },
                "fairness": {
                    "metric_name": criteria_list[0],
                    "value": float(fairness_val)
                },
                "group_fairness": group_fairness,
                "worst_case": worst_case
            }

        # 1. Baseline Model
        print(f"Training baseline model: {model_name} for mitigation...")
        clf_base, X_train, X_test, y_train, y_test, y_pred_base = choosemodel(df, target_col, model_name)
        res_baseline = eval_and_package(y_pred_base, X_test, y_test)

        # 2. Reweighing Model
        from debiasing import train_modelreweighting, debias_pipeline
        clf_rew, _, _, _, _, y_pred_rew, weights = train_modelreweighting(
            df, target_col, model_name, sensitive_features, debias=True, method="equalized_odds"
        )
        res_reweighing = eval_and_package(y_pred_rew, X_test, y_test)

        # 3. Threshold Optimization Model
        try:
            y_pred_to, _ = debias_pipeline(
                clf_base, X_train, y_train, X_test, sensitive_features, criteria_list, weights=None
            )
            res_thresh_opt = eval_and_package(y_pred_to, X_test, y_test)
        except Exception as e:
            print("Threshold opt failed:", e)
            res_thresh_opt = res_baseline

        # 4. Reweighing + Threshold Optimization
        try:
            y_pred_both, _ = debias_pipeline(
                clf_rew, X_train, y_train, X_test, sensitive_features, criteria_list, weights=weights
            )
            res_both = eval_and_package(y_pred_both, X_test, y_test)
        except Exception as e:
            print("Both mitigation failed:", e)
            res_both = res_reweighing

        # Recommendation Logic
        base_f1 = res_baseline["performance"]["f1_score"]
        base_fair = res_baseline["fairness"]["value"]
        
        methods = {
            "Reweighing": res_reweighing,
            "Threshold Optimization": res_thresh_opt,
            "Reweighing + Threshold Optimization": res_both
        }
        
        best_method = "Reweighing"
        best_fair = base_fair
        
        for m_name, m_res in methods.items():
            m_f1 = m_res["performance"]["f1_score"]
            m_fair = m_res["fairness"]["value"]
            
            if (base_f1 - m_f1) < 0.05:
                if m_fair < best_fair:
                    best_fair = m_fair
                    best_method = m_name

        return {
            "results": {
                "Baseline": res_baseline,
                "Reweighing": res_reweighing,
                "Threshold Optimization": res_thresh_opt,
                "Reweighing + Threshold Optimization": res_both
            },
            "recommendation": best_method
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-api")
async def generate_api(
    request: Request,
    file: UploadFile = File(...),
    model: str = Form(...),
    metrics: str = Form(...),
    sensitive: str = Form(...),
    method: str = Form(...)
):
    global DEPLOYED_MODEL
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        df = process_dataset(df, verbose=False)
        target_col = df.columns[-1]
        
        mapping_models = {
            'lr': 'logistic',
            'rf': 'random_forest',
            'svm': 'svm',
            'xgb': 'xgboost'
        }
        model_name = mapping_models.get(model, 'random_forest')
        sensitive_features = [s.strip() for s in sensitive.split(",")]
        
        mapping_criteria = {
            'dp': 'demographic_parity',
            'eo': 'equal_opportunity',
            'eq_odds': 'equalized_odds'
        }
        criteria_list = [mapping_criteria.get(metrics, 'demographic_parity')]
        
        # Train baseline
        clf_base, X_train, X_test, y_train, y_test, y_pred_base = choosemodel(df, target_col, model_name)
        
        deploy_type = "pipeline"
        preprocessor = clf_base.named_steps["prep"]
        final_model = clf_base.named_steps["model"]
        
        from debiasing import train_modelreweighting, debias_pipeline
        
        if method == "Reweighing":
            clf_rew, _, _, _, _, _, weights = train_modelreweighting(
                df, target_col, model_name, sensitive_features, debias=True, method="equalized_odds"
            )
            preprocessor = clf_rew.named_steps["prep"]
            final_model = clf_rew.named_steps["model"]
            
        elif method == "Threshold Optimization":
            _, post_model = debias_pipeline(
                clf_base, X_train, y_train, X_test, sensitive_features, criteria_list, weights=None
            )
            deploy_type = "threshold_optimizer"
            final_model = post_model
            
        elif method == "Reweighing + Threshold Optimization":
            clf_rew, _, _, _, _, _, weights = train_modelreweighting(
                df, target_col, model_name, sensitive_features, debias=True, method="equalized_odds"
            )
            _, post_model = debias_pipeline(
                clf_rew, X_train, y_train, X_test, sensitive_features, criteria_list, weights=weights
            )
            deploy_type = "threshold_optimizer"
            preprocessor = clf_rew.named_steps["prep"]
            final_model = post_model
            
        # Serialize and Load into memory
        # Save to temp directory to prevent Uvicorn and Vite from hot-reloading the app and resetting state
        deploy_dir = os.path.join(tempfile.gettempdir(), "equisense_models")
        os.makedirs(deploy_dir, exist_ok=True)
        
        # Extract dtypes for better dummy generation
        input_format = {}
        for col in X_train.columns:
            dtype = str(X_train[col].dtype)
            if 'int' in dtype or 'float' in dtype:
                input_format[col] = "number"
            else:
                input_format[col] = "string"
                
        # Generate API Key
        api_key = str(uuid.uuid4())
        VALID_API_KEYS.add(api_key)
        
        # Save exact pipeline and extracted dummy samples
        class_0_idx = y_test[y_test == y_test.unique()[0]].index[0]
        
        # safely handle class 1 if it exists
        class_1_vals = y_test[y_test != y_test.unique()[0]]
        class_1_idx = class_1_vals.index[0] if len(class_1_vals) > 0 else class_0_idx
        
        global SAMPLE_INPUTS
        SAMPLE_INPUTS["class_0"] = X_test.loc[class_0_idx].to_dict()
        SAMPLE_INPUTS["class_1"] = X_test.loc[class_1_idx].to_dict()
        
        export_data = {
            "type": deploy_type,
            "preprocessor": preprocessor,
            "model": final_model,
            "pipeline": clf_base if deploy_type == "pipeline" else None,
            "sensitive_features": sensitive_features,
            "feature_names": list(X_train.columns),
            "input_format": input_format
        }
        
        joblib.dump(export_data, os.path.join(deploy_dir, "final_model.pkl"))
        DEPLOYED_MODEL = export_data
        
        return {
            "endpoint_url": f"{request.base_url}predict",
            "api_key": api_key,
            "input_format": input_format,
            "status": "active"
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def validate_input_data(data, input_format):
    for key, val in data.items():
        if key not in input_format:
            continue
        expected = input_format[key]
        if expected == "string" and not isinstance(val, str):
            raise HTTPException(400, f"Validation Error: '{key}' must be a string")
        if expected == "number" and not isinstance(val, (int, float)):
            raise HTTPException(400, f"Validation Error: '{key}' must be numeric")

@app.get("/sample-input")
def get_sample(class_label: int = 0):
    if not SAMPLE_INPUTS:
        raise HTTPException(status_code=404, detail="No model deployed yet")
    return SAMPLE_INPUTS["class_1"] if class_label == 1 else SAMPLE_INPUTS["class_0"]

@app.post("/predict")
def predict(
    payload: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if credentials.credentials not in VALID_API_KEYS:
        raise HTTPException(status_code=403, detail="Invalid API Key")
        
    if DEPLOYED_MODEL is None:
        raise HTTPException(status_code=400, detail="No model deployed yet")
        
    try:
        # Validate data types
        validate_input_data(payload, DEPLOYED_MODEL['input_format'])
        
        df = pd.DataFrame([payload])
        # Ensure all columns exist
        for col in DEPLOYED_MODEL['feature_names']:
            if col not in df.columns:
                df[col] = 0 if DEPLOYED_MODEL['input_format'][col] == "number" else "Unknown"
                
        df = df[DEPLOYED_MODEL['feature_names']]
        
        if DEPLOYED_MODEL['type'] == 'threshold_optimizer':
            # Needs manual encoding and sensitive feature separation
            X_enc = DEPLOYED_MODEL['preprocessor'].transform(df)
            if hasattr(X_enc, "toarray"):
                X_enc = X_enc.toarray()
                
            from debiasing import combine_sensitive_features
            A = combine_sensitive_features(df, DEPLOYED_MODEL['sensitive_features'])
            pred = DEPLOYED_MODEL['model'].predict(X_enc, sensitive_features=A)
        else:
            # Use raw pipeline natively
            pred = DEPLOYED_MODEL['pipeline'].predict(df)
            
        return {"prediction": int(pred[0])}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
