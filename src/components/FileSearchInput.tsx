import React, { useState, useMemo, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useS3Store, TreeNode } from "./fileService";
import { FileIcon } from "lucide-react";
import { useFileStore } from '@/components/HotkeyService';


interface FileSelectorProps {
  width: number | string;
  height: number | string;
  onFileSelect?: (file: FileItem) => void;
}

interface FileItem {
  fileId: string;
  fileName: string;
  fullPath: string;
  parentFolderId: string;
  parentFolderName: string;
}

const FileSelector: React.FC<FileSelectorProps> = ({ onFileSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { searchableFiles } = useFileStore();

  const filteredFiles: FileItem[] = useMemo(() => {
      const files = searchableFiles;
      return files.filter((file: FileItem) =>
          file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [searchQuery, searchableFiles]);

  useEffect(() => {
      if (selectedFile && !filteredFiles.find((file) => file.fileId === selectedFile)) {
          setSelectedFile(null);
      }
  }, [searchQuery, filteredFiles, selectedFile]);

  return (
      <div className="rounded flex flex-col overflow-hidden w-64 h-96 dark:bg-darkbg">
          <ScrollArea className="flex-1 border-none dark:bg-darkbg pt-2">
              <ul>
                  {filteredFiles.map((file) => (
                      <li
                          key={file.fileId}
                          onClick={() => {
                              setSelectedFile(file.fileId);
                              onFileSelect?.(file);
                          }}
                          className="px-4 py-2 text-xs bg-transparent cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-white whitespace-nowrap overflow-hidden text-ellipsis text-left"
                      >
                          <div className="flex items-center">
                              <FileIcon className="mr-2" size={16} />
                              <div className="flex flex-col">
                                  <span>
                                      {file.fileName.length > 20
                                          ? file.fileName.substring(0, 20) + "..."
                                          : file.fileName}
                                  </span>
                                  <span className="text-[.4rem] text-gray-500 dark:text-gray-400">
                                        {file.fullPath.split('/').length > 3 
                                          ? '...' + file.fullPath.split('/').slice(-4).join('/')
                                          : file.fullPath}
                                  </span>
                              </div>
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
                          Selected: {filteredFiles.find((f) => f.fileId === selectedFile)?.fileName}
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
};

export default FileSelector;