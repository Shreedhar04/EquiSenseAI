import pandas as pd
import re
import numpy as np
import os
def process_dataset(input_data, target_col=None, verbose=True):
    """
    input_data: CSV file path OR pandas DataFrame
    target_col: optional target column
    returns: cleaned DataFrame
    """

   

# Step 1: Load dataset
    if isinstance(input_data, str):
        file_ext = os.path.splitext(input_data)[1].lower()

        if file_ext in ['.csv']:
            df = pd.read_csv(input_data)

        elif file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(input_data)

            # Optional: convert to CSV for consistency
            csv_path = input_data.rsplit('.', 1)[0] + ".csv"
            df.to_csv(csv_path, index=False)

            if verbose:
                print(f"Excel file detected. Converted to CSV: {csv_path}")

        else:
            raise ValueError("Unsupported file format! Use CSV or Excel.")

    else:
        df = input_data.copy()



    # Step 2: Validate column names
    for col in df.columns:
      if not re.match(r'^[A-Za-z0-9_ ]+$', col):
            raise ValueError(f"Invalid column name '{col}'")

    # Step 3: Clean column names
    df.columns = df.columns.str.strip()

    # Step 4: Clean string values safely
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].astype(str).str.strip()

    # Step 5: Handle missing values
    df.replace(['?', 'NA', 'null', ''], pd.NA, inplace=True)
    df.dropna(inplace=True)

    # Step 6: Detect target column
    if target_col is None:
        target_col = df.columns[-1]

    if verbose:
        print(f"\nTarget column: {target_col}")

    # Step 7: Encode binary target
    unique_vals = df[target_col].unique()

    if len(unique_vals) != 2:
        raise ValueError("Target column is not binary!")

    unique_vals = sorted(unique_vals)
    mapping = {unique_vals[0]: 0, unique_vals[1]: 1}

    df[target_col] = df[target_col].map(mapping)

    if verbose:
        print("\nLabel mapping:", mapping)
        print("\nProcessed Data:")
        print(df.head())

    return df


# Using CSV file

# data = input("enter the dataset:")
# df = process_dataset(data)
# OR using DataFrame
# df = process_dataset(your_dataframe)s