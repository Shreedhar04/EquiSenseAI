import Papa from 'papaparse';

export const parseAndCleanDataset = (file) => {
    return new Promise((resolve, reject) => {
        console.log("Starting file parse: " + file.name + " (" + file.size + " bytes)");
        if (!file) {
            return reject(new Error("No file provided to parser."));
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const text = event.target.result;
                if (!text || text.trim() === "") {
                    return reject(new Error("File is empty."));
                }

                const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
                if (lines.length === 0) {
                    return reject(new Error("No valid rows found."));
                }

                // Detect headers
                let headerLine = lines[0];
                let headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                
                // If it looks like there are no headers (e.g. adult.data starts with a number like "39")
                // we'll assign generic headers
                let startIndex = 1;
                if (!isNaN(headers[0]) || headers[0] === "") {
                    startIndex = 0;
                    headers = headers.map((_, i) => `Column_${i+1}`);
                }

                const cleanedData = [];

                const maxRows = Math.min(lines.length, 100);

                for (let i = startIndex; i < maxRows; i++) {
                    const rowText = lines[i];
                    // Very basic CSV splitting (assumes no commas inside quotes)
                    const values = rowText.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                    
                    const cleanedRow = {};
                    let hasData = false;

                    for (let j = 0; j < headers.length; j++) {
                        const colName = headers[j];
                        let val = values[j];
                        
                        if (val === undefined || val === null || val === "?" || val.toLowerCase() === "null" || val.toLowerCase() === "na") {
                            val = "";
                        } else if (val !== "") {
                            hasData = true;
                        }
                        
                        cleanedRow[colName] = val;
                    }

                    if (hasData) {
                        cleanedData.push(cleanedRow);
                    }
                }

                if (cleanedData.length === 0) {
                    return reject(new Error("Dataset contains no valid rows after cleaning."));
                }

                resolve({ data: cleanedData, columns: headers });

            } catch (err) {
                reject(new Error("Parsing crashed: " + err.message));
            }
        };

        reader.onerror = () => {
            reject(new Error("Failed to read file. Please try again."));
        };

        try {
            reader.readAsText(file);
        } catch (err) {
            reject(new Error("Failed to start FileReader: " + err.message));
        }
    });
};
