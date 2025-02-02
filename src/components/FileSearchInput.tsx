import React, { useState, useMemo, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useS3Store, TreeNode } from "./fileService";
import { FileIcon } from "lucide-react";

interface FileSelectorProps {
    width: number | string;
    height: number | string;
}

interface FileItem {
    key: string;
    metadata: {
        originalname: string;
    };
}

const FileSelector: React.FC<FileSelectorProps> = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    // Filter files based on the search query
    const filteredFiles: FileItem[] = useMemo(() => {
        console.log("Search query:", searchQuery);
        console.log("Searchable files:", useS3Store.getState().searchableFiles);
        console.log()
        return useS3Store.getState().searchableFiles.filter((file: FileItem) =>
            file.metadata.originalname.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);

    // Clear selected file if it no longer matches the search query
    useEffect(() => {
        if (selectedFile && !filteredFiles.find((file) => file.key === selectedFile)) {
            setSelectedFile(null);
        }
    }, [searchQuery, filteredFiles, selectedFile]);

    return (
        <div className="rounded flex flex-col overflow-hidden w-64 h-96 dark:bg-darkbg">
            {/* Scrollable file list */}
            <ScrollArea className="flex-1 border-none dark:bg-darkbg pt-2">
                <ul>
                    {filteredFiles.map((file) => (
                        <li
                            key={file.key}
                            onClick={() => setSelectedFile(file.key)}
                            className="px-4 py-2 text-xs bg-transparent cursor-pointer hover:bg-slate-800 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis text-left"
                        >
                            <div className="flex items-center">
                                <FileIcon className="mr-2" size={16} />
                                <span>
                                    {file.metadata.originalname.length > 20
                                        ? file.metadata.originalname.substring(0, 20) + "..."
                                        : file.metadata.originalname}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            </ScrollArea>

            {/* Search input and selected file display */}
            <div className="relative">
                {/* Fade effect */}
                <div className="absolute bottom-full w-full h-8 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
                
                {/* Search input and selected file */}
                <div className="p-2">
                    <Input
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="outline-none dark:bg-slate-950 dark:border-slate-700 h-8 dark:text-gray-200"
                    />
                    {selectedFile && (
                        <div className="mt-2 text-sm text-gray-600">
                            Selected:{" "}
                            {filteredFiles.find((f) => f.key === selectedFile)?.metadata.originalname}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileSelector;
