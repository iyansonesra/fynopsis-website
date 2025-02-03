import React, { useState, useMemo, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useS3Store, TreeNode } from "./fileService";
import { FileIcon } from "lucide-react";

interface FileSelectorProps {
    width: number | string;
    height: number | string;
    onFileSelect?: (file: FileItem) => void;
  }

interface FileItem {
    key: string;
    metadata: {
        originalname: string;
    };
}

const FileSelector: React.FC<FileSelectorProps> = ({ onFileSelect }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
  
    const filteredFiles: FileItem[] = useMemo(() => {
      return useS3Store.getState().searchableFiles.filter((file: FileItem) =>
        file.metadata.originalname.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [searchQuery]);
  
    useEffect(() => {
      if (selectedFile && !filteredFiles.find((file) => file.key === selectedFile)) {
        setSelectedFile(null);
      }
    }, [searchQuery, filteredFiles, selectedFile]);
  
    return (
      <div className="rounded flex flex-col overflow-hidden w-64 h-96 dark:bg-darkbg">
        <ScrollArea className="flex-1 border-none dark:bg-darkbg pt-2">
          <ul>
            {filteredFiles.map((file) => (
              <li
                key={file.key}
                onClick={() => {
                  setSelectedFile(file.key);
                  onFileSelect?.(file); // Return the file object on file selection
                }}
                className="px-4 py-2 text-xs bg-transparent cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis text-left"
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
        <div className="relative">
          <div className="absolute bottom-full w-full h-8 bg-gradient-to-t from-white dark:from-slate-950 to-transparent pointer-events-none" />
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

