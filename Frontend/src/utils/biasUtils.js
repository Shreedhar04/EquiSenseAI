export const suggestSensitiveAttributes = (columns) => {
    const sensitiveKeywords = ['gender', 'sex', 'age', 'race', 'ethnicity', 'income', 'religion', 'location', 'zip', 'country', 'nationality', 'disability'];

    return columns.filter(col => {
        const lowerCol = col.toLowerCase();
        return sensitiveKeywords.some(keyword => lowerCol.includes(keyword));
    });
};
