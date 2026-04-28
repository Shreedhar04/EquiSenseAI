import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from processdata import process_dataset
import eda_getsenssitive_targetvar
from  eda_getsenssitive_targetvar import runpreprocessing_eda
from models import choosemodel
from fairnessmetricsm import compute_fairnessmetrics
from modelperformacemetrics import evaluate_model
from debiasing import train_modelreweighting
from debiasing import select_debiasing_method
from debiasing import debias_pipeline
from fairnessmetricsm import evaluate_fairness
from modelperformacemetrics import model_performance
from compareresults import plot_fairness_comparison
from compareresults import plot_performance_comparison
from compareresults import extract_fairness_summary
from fairnessmetricsm import prepare_fairness_df
from compareresults import plot_multi_fairness



df,sensitive,target = runpreprocessing_eda()


model_name = input("Choose model (logistic, random_forest, svm, xgboost): ").strip().lower()
clf, X_train, X_test, y_train, y_test, y_pred  = choosemodel(df,target,model_name)




valid_criteria = {
    "demographic_parity",
    "equal_opportunity",
    "equalized_odds"
}


mapping = {
    "demographic parity": "demographic_parity",
    "demographicparity": "demographic_parity",
    "equal opportunity": "equal_opportunity",
    "equalopportunity": "equal_opportunity",
    "equalized odds": "equalized_odds",
    "equalize odds": "equalized_odds",
    "equalizedodds": "equalized_odds"
}

criteria = input("Enter the required criteria(demographic parity,equalize odds,equalize oprrtunity):").lower().split(",")

criteria = [mapping.get(c.strip(), c.strip()) for c in criteria]

# validate
for c in criteria:
    if c not in valid_criteria:
        raise ValueError(f"Invalid criteria: {c}")


compute_fairnessmetrics(X_test,y_test,y_pred,target,sensitive,criteria)
evaluate_model(y_test,y_pred,"Before debiasing")



method = select_debiasing_method(criteria)
clfrew, X_trainrew, X_testrew, y_trainrew, y_testrew, y_predrew,weights = train_modelreweighting(
    df,
    target,
    model_name,
    sensitive_features=sensitive,
    debias=True,
    method=method
)



evaluate_model(y_test,y_predrew,"After debiasing by reweighting")
compute_fairnessmetrics(X_test,y_test,y_predrew,target,sensitive,criteria)


# AFTER (reweighting + threshold optimization)
y_pred_after, post_model_hybrid = debias_pipeline(
    clfrew,
    X_train,
    y_train,
    X_test,
    sensitive_features=sensitive,
    criteria=criteria,
    weights=weights
)


evaluate_model(y_test,y_pred_after,"After debiasing by reweighting+threshold optimization")
compute_fairnessmetrics(X_test,y_test,y_pred_after,target,sensitive,criteria)




    # Performance
before_perf = model_performance(y_test, y_pred, verbose=False)
after_perf  = model_performance(y_test, y_pred_after, verbose=False)

plot_performance_comparison(before_perf, after_perf)

# Fairness summaries

fair_df_before = prepare_fairness_df(
    X_test,
    y_test,
    y_pred,
    target
)


fair_df_after = prepare_fairness_df(
    X_test,
    y_test,
    y_pred_after,
    target
)

before_results = evaluate_fairness(fair_df_before, sensitive, target, "pred", criteria)
after_results  = evaluate_fairness(fair_df_after, sensitive, target, "pred", criteria)

before_summary = extract_fairness_summary(before_results)
after_summary  = extract_fairness_summary(after_results)

plot_fairness_comparison(before_summary, after_summary)



y_pred_thresh_only,post_model_thresh = debias_pipeline(
    clf,   # base model
    X_train,
    y_train,
    X_test,
    sensitive_features=sensitive,
    criteria=criteria,
    weights=None
)


predictions = {
    "Base": y_pred,
    "Reweighting": y_predrew,
    "Threshold": y_pred_thresh_only,
    "Reweight + Threshold": y_pred_after
}



performance_results = {}

for name, preds in predictions.items():
    performance_results[name] = model_performance(y_test, preds, verbose=False)



fairness_results = {}

for name, preds in predictions.items():
    fair_df = prepare_fairness_df(X_test, y_test, preds, target)

    results = evaluate_fairness(fair_df, sensitive, target, "pred", criteria)

    fairness_results[name] = extract_fairness_summary(results)





def suggest_best_method(perf_results, fair_results):
    best_score = float("inf")
    best_method = None

    for method in perf_results:
        acc = perf_results[method]["accuracy"]

        # combine fairness gaps
        fairness_penalty = 0
        for feature in fair_results[method]:
            fairness_penalty += fair_results[method][feature]["TPR_diff"]
            fairness_penalty += fair_results[method][feature]["FPR_diff"]

        # objective: minimize fairness penalty + maximize accuracy
        score = fairness_penalty - acc

        if score < best_score:
            best_score = score
            best_method = method

    return best_method




plot_multi_fairness(fairness_results)


method = suggest_best_method(performance_results, fairness_results)
print(f"\n🔥 Recommended method: {method}")

best = input("Choose method: base / reweight / threshold / hybrid:").lower().strip()




if best == "Base":
    final_model = clf
elif best == "Reweighting":
    final_model = clfrew
elif best == "Threshold":
    final_model = post_model_thresh
elif best == "Reweight + Threshold":
    final_model = post_model_hybrid