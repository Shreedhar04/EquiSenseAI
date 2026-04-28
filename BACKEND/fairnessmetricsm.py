import pandas as pd
import numpy as np
from debiasing import preprocess_sensitive_features









def fairness_metrics(df, feature, target_col, pred_col, criteria):
    results = []

    for group in df[feature].unique():
        group_df = df[df[feature] == group]

        row = {
            "group": group,
            "count": int(len(group_df))
        }

        # Demographic Parity
        row["Demographic_Parity"] = group_df[pred_col].mean()

        # TPR (Equal Opportunity)
        tp = ((group_df[pred_col] == 1) & (group_df[target_col] == 1)).sum()
        actual_pos = (group_df[target_col] == 1).sum()
        row["TPR"] = tp / actual_pos if actual_pos != 0 else 0

        # FPR (Equalized Odds)
        fp = ((group_df[pred_col] == 1) & (group_df[target_col] == 0)).sum()
        actual_neg = (group_df[target_col] == 0).sum()
        row["FPR"] = fp / actual_neg if actual_neg != 0 else 0

        results.append(row)

    res_df = pd.DataFrame(results)

    summary = {}

    # Always compute differences for all metrics so frontend can display them
    max_dp = res_df["Demographic_Parity"].max()
    min_dp = res_df["Demographic_Parity"].min()
    
    if max_dp > 0:
        res_df["Disparate_Impact"] = res_df["Demographic_Parity"] / max_dp
    else:
        res_df["Disparate_Impact"] = 0.0
        
    summary["DP_diff"] = float(max_dp - min_dp)
    summary["TPR_diff"] = float(res_df["TPR"].max() - res_df["TPR"].min())
    summary["FPR_diff"] = float(res_df["FPR"].max() - res_df["FPR"].min())

    return res_df, summary




def evaluate_fairness(df, sensitive_features, target_col, pred_col, criteria):
    all_results = {}

    for feature in sensitive_features:
        if feature not in df.columns:
            print(f"Skipping {feature}")
            continue

        metrics, summary = fairness_metrics(
            df, feature, target_col, pred_col, criteria
        )

        all_results[feature] = {
            "table": metrics,
            "summary": summary
        }

    return all_results


def prepare_fairness_df(X_test, y_test, y_pred, target_col):
    df = X_test.copy()
    df[target_col] = y_test.values
    df["pred"] = y_pred
    return df






def plot_demographic_parity(df, feature, pred_col):
    import matplotlib.pyplot as plt
    import seaborn as sns

    rates = df.groupby(feature)[pred_col].mean().reset_index()

    plt.figure(figsize=(6,4))
    sns.barplot(x=feature, y=pred_col, data=rates)
    plt.title(f"Demographic Parity - {feature}")
    plt.ylabel("Prediction Rate")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()

def plot_tpr_fpr(df, feature, target_col, pred_col, criteria):
    import matplotlib.pyplot as plt
    import seaborn as sns

    metrics, _ = fairness_metrics(df, feature, target_col, pred_col, criteria)

    cols = []
    if "TPR" in metrics.columns:
        cols.append("TPR")
    if "FPR" in metrics.columns:
        cols.append("FPR")

    if not cols:
        return  # nothing to plot

    metrics_melted = metrics.melt(
        id_vars="group",
        value_vars=cols,
        var_name="Metric",
        value_name="Rate"
    )

    plt.figure(figsize=(7,4))
    sns.barplot(x="group", y="Rate", hue="Metric", data=metrics_melted)

    plt.title(f"TPR / FPR by {feature}")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()


def plot_disparate_impact(df, feature, target_col, pred_col, criteria):
    import matplotlib.pyplot as plt
    import seaborn as sns

    metrics, _ = fairness_metrics(df, feature, target_col, pred_col, criteria)

    if "Disparate_Impact" not in metrics.columns:
        return

    plt.figure(figsize=(6,4))
    sns.barplot(x="group", y="Disparate_Impact", data=metrics)

    plt.axhline(1.0, linestyle='--')
    plt.title(f"Disparate Impact - {feature}")
    plt.ylabel("Ratio (≈1 is fair)")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()


def fairness_visual_report(df, sensitive_features, target_col, pred_col, criteria):
    
    for feature in sensitive_features:
        if feature not in df.columns:
            print(f"Skipping {feature}")
            continue

        print(f"\n=== Visualizing bias for: {feature} ===")

        # Demographic Parity
        if "demographic_parity" in criteria:
            plot_demographic_parity(df, feature, pred_col)

        # TPR / FPR
        if any(c in criteria for c in ["equal_opportunity", "equalized_odds"]):
            plot_tpr_fpr(df, feature, target_col, pred_col, criteria)

        # Disparate Impact
        if "demographic_parity" in criteria:
            plot_disparate_impact(df, feature, target_col, pred_col, criteria)




def compute_fairnessmetrics(X_test, y_test, y_pred, target_col, sensitive, criteria,dontwant = False):

    fair_df = prepare_fairness_df(X_test, y_test, y_pred, target_col)
    
    # Process continuous sensitive features by binning them so fairness metrics work
    fair_df = preprocess_sensitive_features(fair_df, sensitive)

    results = evaluate_fairness(
        fair_df,
        sensitive_features=sensitive,
        target_col=target_col,
        pred_col="pred",
        criteria=criteria
    )


    for feature, res in results.items():
            print(f"\n=== {feature} ===")
            print(res["table"])

            summary = res["summary"]

            if "DP_diff" in summary:
                print(f"Worst-case DP diff: {summary['DP_diff']:.4f}")

            if "TPR_diff" in summary:
                print(f"Worst-case TPR diff: {summary['TPR_diff']:.4f}")

            if "FPR_diff" in summary:
                print(f"Worst-case FPR diff: {summary['FPR_diff']:.4f}")
    if not dontwant:            
        fairness_visual_report(
        fair_df,
        sensitive_features=sensitive,
        target_col=target_col,
        pred_col="pred",
        criteria=criteria
        )


