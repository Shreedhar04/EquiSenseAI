from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.preprocessing import StandardScaler


def get_model(model_name):
    model_name = model_name.lower()

    if model_name == "logistic":
        return LogisticRegression(max_iter=1000)

    elif model_name == "random_forest":
        return RandomForestClassifier(
            n_estimators=100,
            max_depth=None,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features="sqrt",
            random_state=42,
            n_jobs=-1
        )

    elif model_name == "svm":
        return SVC(probability=True)

    elif model_name == "xgboost":
        try:
            from xgboost import XGBClassifier
            return XGBClassifier(
                eval_metric='logloss',
                use_label_encoder=False
            )
        except ImportError:
            raise ImportError("XGBoost not installed. Run: pip install xgboost")

    else:
        raise ValueError("Unsupported model")
    





def build_preprocessor(cat_cols, num_cols, scale_numeric=True):
    
    if scale_numeric:
        num_transform = StandardScaler()
    else:
        num_transform = "passthrough"

    return ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
        ("num", num_transform, num_cols)
    ])



def train_model(df, target_col, model_name):
    
    # Split X, y
    X = df.drop(columns=[target_col])
    y = df[target_col]

    # Detect feature types
    cat_cols = X.select_dtypes(include='object').columns
    num_cols = X.select_dtypes(exclude='object').columns

    # Preprocessing
    preprocess = build_preprocessor(cat_cols,num_cols)
 

    # Get model
    model = get_model(model_name)

    # Pipeline
    clf = Pipeline([
        ("prep", preprocess),
        ("model", model)
    ])

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    # Train
    clf.fit(X_train, y_train)

    # Predict
    y_pred = clf.predict(X_test)

    return clf, X_train, X_test, y_train, y_test, y_pred







def choosemodel(df,target_col,model_name):
    

    clf, X_train, X_test, y_train, y_test, y_pred = train_model(
        df,
        target_col,
        model_name
    )
    return clf, X_train, X_test, y_train, y_test, y_pred 
