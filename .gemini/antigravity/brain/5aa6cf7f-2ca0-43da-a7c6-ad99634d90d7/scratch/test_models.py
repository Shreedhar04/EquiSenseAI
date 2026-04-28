import pandas as pd
import numpy as np
import sys
import os

# Add BACKEND to path
sys.path.append(r"c:\Users\shree\Desktop\frontend for unbaised ai decesion\BACKEND")

from models import choosemodel

def test_models():
    # Create a small dummy dataset
    data = {
        'age': np.random.randint(20, 60, 100),
        'gender': np.random.choice(['M', 'F'], 100),
        'income': np.random.randint(30000, 100000, 100),
        'target': np.random.choice([0, 1], 100)
    }
    df = pd.DataFrame(data)
    target_col = 'target'
    
    models = ['logistic', 'random_forest', 'svm', 'xgboost']
    
    for model_name in models:
        print(f"\nTesting model: {model_name}")
        try:
            clf, X_train, X_test, y_train, y_test, y_pred = choosemodel(df, target_col, model_name)
            print(f"SUCCESS: {model_name} trained. Predictions shape: {y_pred.shape}")
        except Exception as e:
            print(f"FAILED: {model_name}. Error: {str(e)}")

if __name__ == "__main__":
    test_models()
