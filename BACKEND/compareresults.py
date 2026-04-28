


import pandas as pd
import matplotlib.pyplot as plt

def plot_performance_comparison(before_metrics, after_metrics):
    labels = ["Accuracy", "Precision", "Recall", "F1"]

    before = [
        before_metrics["accuracy"],
        before_metrics["precision"],
        before_metrics["recall"],
        before_metrics["f1"]
    ]

    after = [
        after_metrics["accuracy"],
        after_metrics["precision"],
        after_metrics["recall"],
        after_metrics["f1"]
    ]

    x = range(len(labels))

    plt.figure()
    plt.plot(x, before, marker='o', label="Before")
    plt.plot(x, after, marker='o', label="After")

    plt.xticks(x, labels)
    plt.title("Model Performance Comparison")
    plt.ylabel("Score")
    plt.legend()
    plt.tight_layout()
    plt.show()


def extract_fairness_summary(results):
    summary = {}
    for feature, res in results.items():
        summary[feature] = {
            "TPR_diff": float(res["summary"].get("TPR_diff", 0)),
            "FPR_diff": float(res["summary"].get("FPR_diff", 0))
        }
    return summary



def plot_fairness_comparison(before_summary, after_summary):
    import matplotlib.pyplot as plt

    features = list(before_summary.keys())

    before_tpr = [before_summary[f]["TPR_diff"] for f in features]
    after_tpr  = [after_summary[f]["TPR_diff"] for f in features]

    before_fpr = [before_summary[f]["FPR_diff"] for f in features]
    after_fpr  = [after_summary[f]["FPR_diff"] for f in features]

    x = range(len(features))

    plt.figure()
    plt.plot(x, before_tpr, marker='o', label="TPR Before")
    plt.plot(x, after_tpr, marker='o', label="TPR After")

    plt.plot(x, before_fpr, marker='x', linestyle='--', label="FPR Before")
    plt.plot(x, after_fpr, marker='x', linestyle='--', label="FPR After")

    plt.xticks(x, features)
    plt.title("Fairness Gap Comparison")
    plt.ylabel("Difference")
    plt.legend()
    plt.tight_layout()
    plt.show()



def plot_group_comparison(before_df, after_df, feature):
    import matplotlib.pyplot as plt
    import seaborn as sns

    before_df["Stage"] = "Before"
    after_df["Stage"] = "After"

    combined = pd.concat([before_df, after_df])

    melted = combined.melt(
        id_vars=[feature, "Stage"],
        value_vars=["TPR", "FPR"],
        var_name="Metric",
        value_name="Value"
    )

    plt.figure()
    sns.barplot(
        x=feature,
        y="Value",
        hue="Stage",
        data=melted
    )

    plt.title(f"Group-wise Fairness Comparison - {feature}")
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()





def plot_multi_fairness(fairness_results):
    import matplotlib.pyplot as plt

    methods = list(fairness_results.keys())
    features = list(next(iter(fairness_results.values())).keys())

    for feature in features:
        tpr_vals = [fairness_results[m][feature]["TPR_diff"] for m in methods]
        fpr_vals = [fairness_results[m][feature]["FPR_diff"] for m in methods]

        x = range(len(methods))

        plt.figure()
        plt.plot(x, tpr_vals, marker='o', label="TPR diff")
        plt.plot(x, fpr_vals, marker='x', label="FPR diff")

        plt.xticks(x, methods)
        plt.title(f"Fairness Comparison - {feature}")
        plt.legend()
        plt.tight_layout()
        plt.show()