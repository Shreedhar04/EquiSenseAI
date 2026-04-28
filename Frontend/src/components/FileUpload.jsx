import { useState, useCallback } from 'react';
import { UploadCloud, FileJson } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function FileUpload({ onFileSelect }) {
    const [isHover, setIsHover] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsHover(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }, []);

    const handleFile = (file) => {
        setSelectedFile(file);
        onFileSelect(file);
    };

    return (
        <div
            className={cn(
                "relative rounded-xl border-2 border-dashed p-10 mt-6 transition-all duration-300 flex flex-col items-center justify-center bg-white shadow-sm",
                isHover ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsHover(true); }}
            onDragLeave={() => setIsHover(false)}
            onDrop={handleDrop}
        >
            <input
                type="file"
                accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => { if (e.target.files.length > 0) handleFile(e.target.files[0]); }}
            />

            {!selectedFile ? (
                <>
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4 text-indigo-600">
                        <UploadCloud size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">Upload Dataset</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">
                        Drag and drop your CSV or Excel file here, or click to browse. Max size 50MB.
                    </p>
                </>
            ) : (
                <>
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 text-green-600">
                        <FileJson size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">File Selected</h3>
                    <p className="text-sm text-slate-600 mt-1">{selectedFile.name}</p>
                    <p className="text-xs text-indigo-600 font-medium mt-2 cursor-pointer z-10 relative pointer-events-none">Click or drag a new file to replace</p>
                </>
            )}
        </div>
    );
}
