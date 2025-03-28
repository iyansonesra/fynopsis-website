"use client";

import { BookOpen, BrainCircuit, ChevronDown, Globe, Paperclip, Plus, Send, Sparkle, Sparkles } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import FileSelector from "../tabs/library/querying/FileSearchInput";
import { ScrollArea, ScrollBar } from "./scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./dropdown-menu";


interface AIInputWithSearchProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  onSubmit: (value: string, searchType: string, selectedFiles: any[]) => void;
  onFileSelect: (file: any) => void;
  className?: string;
  disabled?: boolean; // Add this prop
}

export const AIInputWithSearch: React.FC<AIInputWithSearchProps> = ({
  id = "ai-input-with-search",
  placeholder = "Query your documents...",
  minHeight = 48,
  maxHeight = 120,
  onSubmit,
  onFileSelect,
  className,
  disabled = false // Default to false
}) => {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });
  const [showSearch, setShowSearch] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [searchType, setSearchType] = useState<string>("auto");


  const handleSubmit = () => {
    if (value.trim()) {
      // Extract fileId from selectedFiles
      const fileKeys = selectedFiles.map(file => file.fileId);
      onSubmit?.(value, searchType, fileKeys);
      setValue("");
      setSelectedFiles([]);
      adjustHeight(true);
    }
  };

  const searchTypeLabels = {
    auto: "Auto",
    reasoning: "Reasoning",
    planning: "Planning",
    deep_research: "Deep Research"
  };

  const searchTypeIcons = {
    auto: <Sparkles className="w-4 h-4" />,
    reasoning: <BrainCircuit className="w-4 h-4" />,
    planning: <Globe className="w-4 h-4" />,
    deep_research: <BookOpen className="w-4 h-4" />
  };



  return (
    <div className={cn("max-w-[100%] pb-4", className)}>


      <div style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence>
          {selectedFiles.length > 0 && (
            <motion.div
              className="absolute bottom-full w-full flex justify-center mb-[1px]"
              initial={{ opacity: 1, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
              }}
            >
              <div className="w-[97%] h-12 bg-slate-100 dark:bg-slate-800 rounded-t-xl flex items-center px-4">
                <div className="w-full relative">
                  <ScrollArea className="w-full flex items-center">
                    <div className="flex p-0 h-full items-center flex-row gap-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-center gap-2 bg-slate-200 dark:bg-white/5 px-3 py-1 rounded-lg  hover:opacity-80 group relative"
                        >
                          <Paperclip className="w-4 h-4 text-black/50 dark:text-white/50" />
                          <span className="text-sm text-black/70 dark:text-white/70 whitespace-nowrap">
                            {file.fileName > 15
                              ? file.fileName.slice(0, 15) + '...'
                              : file.fileName}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFiles(files => files.filter((_, i) => i !== index));
                            }}
                            className="ml-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden bg-slate-200 dark:bg-slate-800" />
                  </ScrollArea>
                  <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-r rounded-tr-md from-transparent to-slate-100 dark:to-slate-800 pointer-events-none" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </div>


      <div className="relative max-w-[100%] mx-auto outline-none select-none z-20">

        <div className="relative flex flex-col">
          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            <Textarea
              id={id}
              value={value}
              placeholder={placeholder}
              className={`w-full rounded-xl rounded-b-none px-4 py-3 bg-black/5 dark:bg-white/5 border-none dark:text-white placeholder:text-black/70 dark:placeholder:text-white/70 resize-none focus-visible:ring-0 leading-[1.6] z-50 outline-none select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              ref={textareaRef}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              onChange={(e) => {
                setValue(e.target.value);
                adjustHeight();
              }}
              disabled={disabled}
            />
          </div>

          <div className="h-12 bg-black/5 dark:bg-white/5 rounded-b-xl">
            <div className="absolute left-3 bottom-3 flex items-center gap-2">

              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger>
                  <div className="cursor-pointer rounded-lg p-2 bg-black/5 dark:bg-white/5">
                    <Plus className="w-4 h-4 text-black/20 dark:text-white/20" />
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-fit bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg text-center"
                  side="top"
                  align="center"
                  sideOffset={5}
                >
                  <FileSelector
                    width={""}
                    height={""}
                    onFileSelect={(file) => {
                      // Update the local list of files
                      setSelectedFiles((prev) => [...prev, file]);
                      // Call the parent callback so the AI input hears about the file
                      onFileSelect?.(file);
                      // Close the popover after selecting a file
                      setIsPopoverOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>


              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "rounded-full transition-all flex items-center gap-2 px-3 py-1 border h-8",
                      "bg-black/5 dark:bg-white/5 border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-black/70 dark:text-white/70 select-none outline-none"
                    )}
                    disabled={disabled}
                  >
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      {searchTypeIcons[searchType as keyof typeof searchTypeIcons]}
                    </div>
                    <span className="text-sm">{searchTypeLabels[searchType as keyof typeof searchTypeLabels]}</span>
                    <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[150px]">
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={() => setSearchType("auto")}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Auto</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={() => setSearchType("reasoning")}
                  >
                    <BrainCircuit className="w-4 h-4" />
                    <span>Reasoning</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={() => setSearchType("planning")}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Planning</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={() => setSearchType("deep_research")}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Deep Search</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="absolute right-3 bottom-3">
              <button
                type="button"
                onClick={handleSubmit}
                className={cn(
                  "rounded-lg p-2 transition-colors",
                  value
                    ? "bg-sky-500/15 text-sky-500"
                    : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white",
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                )}
                disabled={disabled}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};