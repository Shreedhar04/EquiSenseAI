import numpy as np
import pandas as pd
from models import *





def stable_intersectional_eo_weights(
    df,
    label_col,
    sensitive_cols,
    alpha=1.0,        # Laplace smoothing
    epsilon=1e-6,     # safety
    max_weight=10.0   # clip weights
):
    """
    Stable Equalized Odds-style reweighting with:
    - Intersectional groups
    - Laplace smoothing
    - Weight clipping

    Args:
        df : pandas DataFrame
        label_col : target column name
        sensitive_cols : list of sensitive attributes (e.g., ['gender', 'race'])
        alpha : Laplace smoothing parameter
        epsilon : small value to avoid division by zero
        max_weight : cap on weights

    Returns:
        weights : numpy array
    """

    Y = df[label_col]
    N = len(df)

    # Combine sensitive attributes → intersectional group
    A = df[sensitive_cols].apply(lambda row: tuple(row), axis=1)

    groups = A.unique()
    y_values = sorted(Y.unique())

    # 🔹 Step 1: Compute P(Y)
    P_y = {y: np.sum(Y == y) / N for y in y_values}

    # 🔹 Step 2: Compute P(Y | group) with Laplace smoothing
    P_y_given_group = {}

    for g in groups:
        mask_g = (A == g)
        total_g = np.sum(mask_g)

        for y in y_values:
            count_gy = np.sum((Y == y) & mask_g)

            # Laplace smoothing
            P_y_given_group[(g, y)] = (count_gy + alpha) / (
                total_g + alpha * len(y_values)
            )

    # 🔹 Step 3: Compute weights
    weights = np.zeros(N)

    for i in range(N):
        g = A.iloc[i]
        y = Y.iloc[i]

        w = P_y[y] / (P_y_given_group[(g, y)] + epsilon)

        # Clip extreme weights
        weights[i] = min(w, max_weight)

    return weights




def apply_reweighting(
    X_train_orig,
    y_train,
    sensitive_features,
    target_col,
    method="equalized_odds"
):
    """
    Returns sample weights based on method using ORIGINAL unencoded data.
    """

    df = X_train_orig.copy()
    df[target_col] = y_train.values

    # Apply binning for continuous sensitive features before reweighting
    df = preprocess_sensitive_features(df, sensitive_features)

    if method == "equalized_odds":
        weights = stable_intersectional_eo_weights(
            df,
            label_col=target_col,
            sensitive_cols=sensitive_features
        )
    else:
        weights = None  # extend later

    return weights


def train_modelreweighting(df, target_col, model_name, sensitive_features=None, debias=False, method=None):

    X = df.drop(columns=[target_col])
    y = df[target_col]

    cat_cols = X.select_dtypes(include='object').columns
    num_cols = X.select_dtypes(exclude='object').columns

    scale_numeric = model_name.lower() in ["logistic", "svm"]

    preprocess = build_preprocessor(cat_cols, num_cols, scale_numeric)
    model = get_model(model_name)

    clf = Pipeline([
        ("prep", preprocess),
        ("model", model)
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 🔥 APPLY DEBIASING
    if debias and sensitive_features is not None:
        weights = apply_reweighting(
            X_train,
            y_train,
            sensitive_features,
            target_col,
            method
        )

        clf.fit(X_train, y_train, model__sample_weight=weights)
    else:
        clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)

    return clf, X_train, X_test, y_train, y_test, y_pred,weights



def select_debiasing_method(criteria):
    if "equalized_odds" in criteria:
        return "equalized_odds"
    elif "demographic_parity" in criteria:
        return "reweighting_dp"  # future
    else:
        return None
    


def validate_sensitive(df, sensitive):
    valid = [s for s in sensitive if s in df.columns]
    if not valid:
        raise ValueError("No valid sensitive features found")
    return valid

def is_continuous(series):
    return series.nunique() > 10

def bin_sensitive_feature(df, feature, bins=4):
    try:
        df[feature] = pd.qcut(df[feature], q=bins, duplicates='drop').astype(str)
    except ValueError:
        pass # In case qcut fails due to low variance
    return df

def preprocess_sensitive_features(df, sensitive_features):
    for f in sensitive_features:
        if f in df.columns and is_continuous(df[f]):
            df = bin_sensitive_feature(df, f)
    return df

def combine_sensitive_features(df, sensitive_features):
    if len(sensitive_features) == 1:
        return df[sensitive_features[0]].astype(str)
    return df[sensitive_features].astype(str).agg("_".join, axis=1)


from fairlearn.postprocessing import ThresholdOptimizer
from sklearn.base import clone

def apply_threshold_optimizer(
    model,
    X_train_enc,
    y_train,
    X_test_enc,
    sensitive_train,
    sensitive_test,
    constraint,
    sample_weights=None
):
    # The model is already fitted from the pipeline, and ThresholdOptimizer
    # uses prefit=True, so we don't need to clone and refit it here.

    # Apply ThresholdOptimizer
    post_model = ThresholdOptimizer(
        estimator=model,
        constraints=constraint,
        prefit=True
    )

    post_model.fit(
        X_train_enc,
        y_train,
        sensitive_features=sensitive_train
    )

    y_pred = post_model.predict(
        X_test_enc,
        sensitive_features=sensitive_test
    )

    return y_pred, post_model


def get_constraint(criteria):
    if "equalized_odds" in criteria:
        return "equalized_odds"
    elif "demographic_parity" in criteria:
        return "demographic_parity"
    else:
        return None


def debias_pipeline(
    clf,                 # trained pipeline
    X_train_orig,
    y_train,
    X_test_orig,
    sensitive_features,
    criteria,
    weights=None
):
    # Extract preprocessor + model
    preprocess = clf.named_steps["prep"]
    model = clf.named_steps["model"]
    
    sensitive_features = validate_sensitive(X_train_orig, sensitive_features)

    # Preprocess sensitive features (binning if continuous)
    X_train_orig_proc = preprocess_sensitive_features(X_train_orig.copy(), sensitive_features)
    X_test_orig_proc = preprocess_sensitive_features(X_test_orig.copy(), sensitive_features)

    # Encode data
    X_train_enc = preprocess.transform(X_train_orig).toarray() if hasattr(preprocess.transform(X_train_orig), 'toarray') else preprocess.transform(X_train_orig)
    X_test_enc = preprocess.transform(X_test_orig).toarray() if hasattr(preprocess.transform(X_test_orig), 'toarray') else preprocess.transform(X_test_orig)

    # Combine sensitive features (must be done on ORIGINAL proc data)
    A_train = combine_sensitive_features(X_train_orig_proc, sensitive_features)
    A_test = combine_sensitive_features(X_test_orig_proc, sensitive_features)

    # Select constraint
    constraint = get_constraint(criteria)

    if constraint is None:
        print("No post-processing applied")
        return clf.predict(X_test_orig), None

    # Apply ThresholdOptimizer (requires ENCODED data for training, but RAW sensitive features)
    y_pred, post_model = apply_threshold_optimizer(
        model,
        X_train_enc,
        y_train,
        X_test_enc,
        A_train,
        A_test,
        constraint,
        sample_weights=weights
    )

    return y_pred, post_model