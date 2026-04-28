def model_performance(y_true, y_pred, title="", average="binary", verbose=True):
    """
    average: 'binary', 'macro', 'weighted'
    """

    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report

    results = {}

    results["accuracy"] = accuracy_score(y_true, y_pred)
    results["precision"] = precision_score(y_true, y_pred, average=average, zero_division=0)
    results["recall"] = recall_score(y_true, y_pred, average=average, zero_division=0)
    results["f1"] = f1_score(y_true, y_pred, average=average, zero_division=0)

    if verbose:
        print(f"\n=== MODEL PERFORMANCE {title} ===")
        print(f"Accuracy : {results['accuracy']:.4f}")
        print(f"Precision: {results['precision']:.4f}")
        print(f"Recall   : {results['recall']:.4f}")
        print(f"F1 Score : {results['f1']:.4f}")

        print("\nClassification Report:\n")
        print(classification_report(y_true, y_pred, zero_division=0))

    return results



def plot_confusion_matrix(y_true, y_pred, labels=None, title="Confusion Matrix"):
    import matplotlib.pyplot as plt
    import seaborn as sns
    from sklearn.metrics import confusion_matrix

    cm = confusion_matrix(y_true, y_pred, labels=labels)

    plt.figure(figsize=(5,4))
    sns.heatmap(cm, annot=True, fmt='d')

    plt.title(title)
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    plt.show()

def evaluate_model(y_true, y_pred, title="", average="binary", show_cm=True):
    
    results = model_performance(y_true, y_pred, title, average)

    if show_cm:
        plot_confusion_matrix(y_true, y_pred, title=f"{title} - Confusion Matrix")

    return results


def evaluvate_model(y_test,y_pred,title):
    evaluate_model(
        y_test,
        y_pred,
        title=title,
        average="binary"
    )