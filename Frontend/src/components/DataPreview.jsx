export function DataPreview({ data, columns }) {
    if (!data || data.length === 0) return null;

    const previewData = data.slice(0, 5);

    return (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Data Preview</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Showing {previewData.length} of {data.length} rows</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i} scope="col" className="px-6 py-3 whitespace-nowrap">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {previewData.map((row, i) => (
                            <tr key={i} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                {columns.map((col, j) => (
                                    <td key={j} className="px-6 py-4 whitespace-nowrap min-w-[120px]">
                                        {row[col] ? (
                                            <span className="truncate block max-w-xs">{row[col]}</span>
                                        ) : (
                                            <span className="text-slate-300 italic">Empty</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
