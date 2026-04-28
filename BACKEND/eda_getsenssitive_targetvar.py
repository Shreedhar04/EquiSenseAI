import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from processdata import process_dataset





data = input("enter the dataset:")
df = process_dataset(data)


def plot_sensitive_distribution(df, sensitive_features):
    import matplotlib.pyplot as plt
    import seaborn as sns

    for feature in sensitive_features:
        if feature not in df.columns:
            print(f"Skipping {feature} (not found)")
            continue

        plt.figure(figsize=(6,4))
        sns.countplot(x=feature, data=df)
        plt.title(f"Distribution of {feature}")
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()


def plot_sensitive_vs_target(df, sensitive_features, target_col):
    import matplotlib.pyplot as plt
    import seaborn as sns

    for feature in sensitive_features:
        if feature not in df.columns:
            print(f"Skipping {feature} (not found)")
            continue

        plt.figure(figsize=(6,4))
        sns.countplot(x=feature, hue=target_col, data=df)
        plt.title(f"{target_col} distribution by {feature}")
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()


def run_eda(df, sensitive_features, target_col):
    print("\n=== Running EDA ===")

    plot_sensitive_distribution(df, sensitive_features)
    plot_sensitive_vs_target(df, sensitive_features, target_col)
    plot_positive_rate(df, sensitive_features, target_col)



def plot_positive_rate(df, sensitive_features, target_col):
    import matplotlib.pyplot as plt
    import seaborn as sns

    for feature in sensitive_features:
        if feature not in df.columns:
            print(f"Skipping {feature} (not found)")
            continue

        rates = df.groupby(feature)[target_col].mean().reset_index()

        plt.figure(figsize=(6,4))
        sns.barplot(x=feature, y=target_col, data=rates)
        plt.title(f"Positive Rate by {feature}")
        plt.ylabel(f"P({target_col}=1)")
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()




def get_target_and_sensitive(df, sensitive_features, target_col=None):
    """
    df: DataFrame
    sensitive_features: list of columns (given by user)
    target_col: optional (auto-detect if None)

    returns:
        target_col, valid_sensitive_features
    """

    # Step 1: Auto-detect target column
    if target_col is None:
        target_col = df.columns[-1]

    # Step 2: Validate target column
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset")

    # Step 3: Validate sensitive features
    valid_sensitive = []
    for col in sensitive_features:
        if col in df.columns:
            valid_sensitive.append(col)
        else:
            print(f"Warning: '{col}' not found → skipping")

    if len(valid_sensitive) == 0:
        raise ValueError("No valid sensitive features found!")

    return target_col, valid_sensitive







def runpreprocessing_eda(dontwant = False):
    
    sensitive = input("Enter the sensitive features seperated by comma:").split(",")
    target, sensitive = get_target_and_sensitive(
    df,
    sensitive_features=sensitive,  # user input
    )

    print("Target:", target)
    print("Sensitive:", sensitive)
    
    if not dontwant:
        run_eda(df, sensitive, target)

    return df,sensitive,target