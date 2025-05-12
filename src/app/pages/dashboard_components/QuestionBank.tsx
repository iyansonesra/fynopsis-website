"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Search, X, Tag, Edit2, Check, ChevronDown, ChevronUp } from "lucide-react";
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

type Question = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  tags: string[];
};

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState({
    title: "",
    description: "",
    tags: [] as string[],
  });
  const [newTagInput, setNewTagInput] = useState("");
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const [tagFilterSearch, setTagFilterSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Get all unique tags from questions
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    questions.forEach(question => {
      question.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [questions]);

  // Define table columns
  const columns: ColumnDef<Question>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Title
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        const question = row.original;
        const isEditing = editingQuestion?.id === question.id;
        
        return isEditing ? (
          <Input
            value={editingQuestion.title}
            onChange={(e) => setEditingQuestion({...editingQuestion, title: e.target.value})}
            className="w-full"
          />
        ) : (
          <div>{question.title}</div>
        );
      },
    },
    {
      accessorKey: "description",
      header: ({ column }) => {
        return (
          <div className="flex items-center">
            <span>Description</span>
            <div
              onMouseDown={(e) => {
                const startX = e.pageX;
                const startWidth = column.getSize();
                const handleMouseMove = (e: MouseEvent) => {
                  const newWidth = startWidth + (e.pageX - startX);
                  (column as any).setSize(Math.max(250, newWidth));
                };
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              onTouchStart={(e) => {
                const startX = e.touches[0].pageX;
                const startWidth = column.getSize();
                const handleTouchMove = (e: TouchEvent) => {
                  const newWidth = startWidth + (e.touches[0].pageX - startX);
                  (column as any).setSize(Math.max(250, newWidth));
                };
                const handleTouchEnd = () => {
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                };
                document.addEventListener('touchmove', handleTouchMove);
                document.addEventListener('touchend', handleTouchEnd);
              }}
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none"
            >
              <div className="absolute right-0 top-0 h-full w-1 bg-border hover:bg-primary/50 transition-colors" />
            </div>
          </div>
        );
      },
      cell: ({ row }) => {
        const question = row.original;
        const isEditing = editingQuestion?.id === question.id;
        
        return isEditing ? (
          <Textarea
            value={editingQuestion.description || ""}
            onChange={(e) => setEditingQuestion({...editingQuestion, description: e.target.value})}
            className="w-full"
          />
        ) : (
          <div className="whitespace-pre-wrap break-words">{question.description || "-"}</div>
        );
      },
      size: 250,
    },
    {
      accessorKey: "tags",
      header: ({ column }) => {
        return (
          <div className="flex items-center">
            <span>Tags</span>
            <div
              onMouseDown={(e) => {
                const startX = e.pageX;
                const startWidth = column.getSize();
                const handleMouseMove = (e: MouseEvent) => {
                  const newWidth = startWidth + (e.pageX - startX);
                  (column as any).setSize(Math.max(180, newWidth));
                };
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              onTouchStart={(e) => {
                const startX = e.touches[0].pageX;
                const startWidth = column.getSize();
                const handleTouchMove = (e: TouchEvent) => {
                  const newWidth = startWidth + (e.touches[0].pageX - startX);
                  (column as any).setSize(Math.max(180, newWidth));
                };
                const handleTouchEnd = () => {
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                };
                document.addEventListener('touchmove', handleTouchMove);
                document.addEventListener('touchend', handleTouchEnd);
              }}
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none"
            >
              <div className="absolute right-0 top-0 h-full w-1 bg-border hover:bg-primary/50 transition-colors" />
            </div>
          </div>
        );
      },
      cell: ({ row }) => {
        const question = row.original;
        const isEditing = editingQuestion?.id === question.id;
        
        return isEditing ? (
          <div className="flex flex-wrap gap-1">
            {editingQuestion.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => {
                setEditingQuestion({
                  ...editingQuestion,
                  tags: editingQuestion.tags.filter(t => t !== tag)
                });
              }}>
                {tag} <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
            <Input
              placeholder="Add tag..."
              className="w-24 h-6 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const newTag = e.currentTarget.value.trim();
                  if (newTag && !editingQuestion.tags.includes(newTag)) {
                    setEditingQuestion({
                      ...editingQuestion,
                      tags: [...editingQuestion.tags, newTag]
                    });
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-full">
            {question.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs whitespace-nowrap">
                {tag}
              </Badge>
            ))}
          </div>
        );
      },
      size: 180,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1"
          >
            Created At
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : null}
          </Button>
        );
      },
      cell: ({ row }) => {
        return new Date(row.original.createdAt).toLocaleDateString();
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const question = row.original;
        const isEditing = editingQuestion?.id === question.id;
        
        return (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setQuestions(questions.map(q => 
                      q.id === editingQuestion.id ? editingQuestion : q
                    ));
                    setEditingQuestion(null);
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingQuestion(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingQuestion(question)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteQuestion(question.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  // Filter questions based on search query and selected tags
  const filteredQuestions = useMemo(() => {
    return questions.filter(question => {
      const matchesSearch = question.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (question.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.every(tag => question.tags.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [questions, searchQuery, selectedTags]);

  // Initialize table
  const table = useReactTable({
    data: filteredQuestions,
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

  const handleAddQuestion = () => {
    if (newQuestion.title.trim()) {
      const question: Question = {
        id: Date.now().toString(),
        title: newQuestion.title,
        description: newQuestion.description.trim() || undefined,
        createdAt: new Date().toISOString(),
        tags: newQuestion.tags,
      };
      setQuestions([...questions, question]);
      setNewQuestion({ title: "", description: "", tags: [] });
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleAddTag = (tag?: string) => {
    const tagToAdd = tag || newTagInput.trim();
    if (tagToAdd && !newQuestion.tags.includes(tagToAdd)) {
      setNewQuestion({
        ...newQuestion,
        tags: [...newQuestion.tags, tagToAdd],
      });
      setNewTagInput("");
      setIsTagPopoverOpen(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewQuestion({
      ...newQuestion,
      tags: newQuestion.tags.filter(tag => tag !== tagToRemove),
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
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Question Bank</h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
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
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>
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
                  No questions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
            <DialogTitle>Add New Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Question Title"
              value={newQuestion.title}
              onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
              className="focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none min-h-[40px] resize-none border border-border/50"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
            <Textarea
              placeholder="Question Description (optional)"
              value={newQuestion.description}
              onChange={(e) => setNewQuestion({ ...newQuestion, description: e.target.value })}
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
                {newQuestion.tags.map(tag => (
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
            <Button onClick={handleAddQuestion}>Add Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 