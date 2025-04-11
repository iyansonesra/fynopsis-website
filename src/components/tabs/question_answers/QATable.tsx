"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Search, X, Tag, Edit2, Check, ChevronDown, ChevronUp, Info, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePermissionsStore } from "@/stores/permissionsStore";

type QAItem = {
  id: string;
  question: string;
  answer: string;
  description?: string;
  createdAt: string;
  tags: string[];
};

export default function QATable() {
  const [qaItems, setQaItems] = useState<QAItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newQAItem, setNewQAItem] = useState({
    question: "",
    answer: "",
    description: "",
    tags: [] as string[],
  });
  const [newTagInput, setNewTagInput] = useState("");
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const [tagFilterSearch, setTagFilterSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingQAItem, setEditingQAItem] = useState<QAItem | null>(null);
  const [selectedQAItem, setSelectedQAItem] = useState<QAItem | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const { permissionDetails } = usePermissionsStore();

  // Get all unique tags from qaItems
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    qaItems.forEach(item => {
      item.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [qaItems]);

  // Define table columns
  const columns: ColumnDef<QAItem>[] = [
    {
      accessorKey: "question",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Question
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingQAItem?.id === item.id;
        
        return isEditing ? (
          <Input
            value={editingQAItem.question}
            onChange={(e) => setEditingQAItem({...editingQAItem, question: e.target.value})}
            className="w-full"
          />
        ) : (
          <div className="flex items-center gap-2">
            <span>{item.question}</span>
            {(item.description || item.tags.length > 0) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    {item.description && (
                      <div className="mb-2">
                        <span className="font-semibold">Description:</span>
                        <p className="text-sm">{item.description}</p>
                      </div>
                    )}
                    {item.tags.length > 0 && (
                      <div>
                        <span className="font-semibold">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "answer",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Answer
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingQAItem?.id === item.id;
        
        return isEditing ? (
          <Textarea
            value={editingQAItem.answer}
            onChange={(e) => setEditingQAItem({...editingQAItem, answer: e.target.value})}
            className="w-full"
          />
        ) : (
          <div className="whitespace-pre-wrap break-words">{item.answer}</div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        const isEditing = editingQAItem?.id === item.id;
        
        return (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setQaItems(qaItems.map(q => 
                      q.id === editingQAItem.id ? editingQAItem : q
                    ));
                    setEditingQAItem(null);
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingQAItem(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingQAItem(item)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteQAItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedQAItem(item);
                    setIsSidePanelOpen(true);
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  // Filter qaItems based on search query and selected tags
  const filteredQAItems = useMemo(() => {
    return qaItems.filter(item => {
      const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.every(tag => item.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [qaItems, searchQuery, selectedTags]);

  // Initialize table
  const table = useReactTable({
    data: filteredQAItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
      globalFilter: searchQuery,
    },
  });

  // Filter tag suggestions based on input
  const filteredTagSuggestions = useMemo(() => {
    if (!newTagInput) return allTags;
    return allTags.filter(tag => 
      tag.toLowerCase().includes(newTagInput.toLowerCase())
    );
  }, [allTags, newTagInput]);

  // Filter tag suggestions for the filter dropdown
  const filteredTagSuggestionsForFilter = useMemo(() => {
    if (!tagFilterSearch) return allTags;
    return allTags.filter(tag => 
      tag.toLowerCase().includes(tagFilterSearch.toLowerCase())
    );
  }, [allTags, tagFilterSearch]);

  const handleAddQAItem = () => {
    if (newQAItem.question.trim() && newQAItem.answer.trim()) {
      const qaItem: QAItem = {
        id: Date.now().toString(),
        question: newQAItem.question,
        answer: newQAItem.answer,
        description: newQAItem.description.trim() || undefined,
        createdAt: new Date().toISOString(),
        tags: newQAItem.tags,
      };
      setQaItems([...qaItems, qaItem]);
      setNewQAItem({ question: "", answer: "", description: "", tags: [] });
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteQAItem = (id: string) => {
    setQaItems(qaItems.filter((q) => q.id !== id));
  };

  const handleAddTag = (tag?: string) => {
    const tagToAdd = tag || newTagInput.trim();
    if (tagToAdd && !newQAItem.tags.includes(tagToAdd)) {
      setNewQAItem({
        ...newQAItem,
        tags: [...newQAItem.tags, tagToAdd],
      });
      setNewTagInput("");
      setIsTagPopoverOpen(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewQAItem({
      ...newQAItem,
      tags: newQAItem.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleRemoveFilterTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  // Focus tag input when popover opens
  useEffect(() => {
    if (isTagPopoverOpen && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isTagPopoverOpen]);

  // Handle click outside to close tag dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        // Check if the click was on a tag item
        const clickedElement = event.target as HTMLElement;
        const isTagItem = clickedElement.closest('[data-tag-item]');
        if (!isTagItem) {
          setIsTagPopoverOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4 relative w-full h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Q&A</h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions and answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-24 outline-none select-none"
            />
            <Popover open={isTagFilterOpen} onOpenChange={setIsTagFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  Filter Tags
                  {selectedTags.length > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground rounded-full h-4 w-4 text-[10px] flex items-center justify-center">
                      {selectedTags.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="end">
                <Command>
                  <CommandInput 
                    placeholder="Search tags..." 
                    value={tagFilterSearch}
                    onValueChange={setTagFilterSearch}
                  />
                  <CommandList>
                    {filteredTagSuggestionsForFilter.length === 0 && tagFilterSearch ? (
                      <CommandEmpty>No tags found.</CommandEmpty>
                    ) : (
                      filteredTagSuggestionsForFilter.map((tag) => (
                        <div
                          key={tag}
                          className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                          onClick={() => {
                            if (selectedTags.includes(tag)) {
                              handleRemoveFilterTag(tag);
                            } else {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                        >
                          <span>{tag}</span>
                          {selectedTags.includes(tag) && (
                            <span className="text-primary">✓</span>
                          )}
                        </div>
                      ))
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <TooltipProvider>
            {!permissionDetails?.canAddQuestionaire ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button onClick={() => setIsAddDialogOpen(true)} disabled>
                      <Plus className="mr-2 h-4 w-4" /> Add Q&A
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Adding questions is disabled
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Q&A
              </Button>
            )}
          </TooltipProvider>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No Q&A items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Side Panel */}
      <div 
        className={cn(
          "fixed right-0 top-0 h-full w-1/3 bg-background border-l shadow-lg transform transition-transform duration-300 ease-in-out z-50",
          isSidePanelOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {selectedQAItem && (
          <div className="flex flex-col h-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Q&A Details</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidePanelOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-6 overflow-y-auto flex-1">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Question</h3>
                <div className="p-3 bg-muted rounded-md">
                  {selectedQAItem.question}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Answer</h3>
                <div className="p-3 bg-muted rounded-md whitespace-pre-wrap">
                  {selectedQAItem.answer}
                </div>
              </div>
              
              {selectedQAItem.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                  <div className="p-3 bg-muted rounded-md">
                    {selectedQAItem.description}
                  </div>
                </div>
              )}
              
              {selectedQAItem.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedQAItem.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Created</h3>
                <div className="text-sm">
                  {new Date(selectedQAItem.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingQAItem(selectedQAItem);
                  setIsSidePanelOpen(false);
                }}
              >
                Edit
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  handleDeleteQAItem(selectedQAItem.id);
                  setIsSidePanelOpen(false);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent 
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add New Q&A</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Question"
              value={newQAItem.question}
              onChange={(e) => setNewQAItem({ ...newQAItem, question: e.target.value })}
              className="focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none min-h-[40px] resize-none border border-border/50"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
            <Textarea
              placeholder="Answer"
              value={newQAItem.answer}
              onChange={(e) => setNewQAItem({ ...newQAItem, answer: e.target.value })}
              className="focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none min-h-[80px] resize-none border border-border/50"
            />
            <Textarea
              placeholder="Description (optional)"
              value={newQAItem.description}
              onChange={(e) => setNewQAItem({ ...newQAItem, description: e.target.value })}
              className="focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
            />
            <div className="space-y-2">
              <div className="relative">
                <div className="flex gap-2" ref={tagDropdownRef}>
                  <Input
                    ref={tagInputRef}
                    placeholder="Add tags..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onFocus={() => setIsTagPopoverOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                  />
                  <Button onClick={() => handleAddTag()}>Add</Button>
                </div>
                {isTagPopoverOpen && (
                  <div 
                    className="absolute top-full left-0 mt-1 w-[200px] bg-popover text-popover-foreground shadow-md rounded-md border border-border z-50"
                  >
                    <div className="flex flex-col max-h-[200px] overflow-y-auto p-1">
                      {filteredTagSuggestions.length === 0 && newTagInput ? (
                        <div className="p-2 text-sm text-muted-foreground">No tags found.</div>
                      ) : (
                        filteredTagSuggestions.map((tag) => (
                          <button
                            key={tag}
                            data-tag-item
                            className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddTag(tag);
                            }}
                          >
                            <span>{tag}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddTag(tag);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {newQAItem.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                    {tag} <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddQAItem}>Add Q&A</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 