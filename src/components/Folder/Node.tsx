import React, { useState } from 'react';
import { AiFillFolder, AiFillFile } from "react-icons/ai";
import { MdArrowRight, MdArrowDropDown, MdEdit } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";
import { ChevronRight, Folder, MoreHorizontal } from "lucide-react";
import { ArrowUpDown, ChevronDown, FileIcon, FolderIcon, Upload } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Node = ({ node, style, dragHandle, tree }: { node: any; style: any; dragHandle?: any; tree: any; }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const CustomIcon = node.data.icon;
  const iconColor = node.data.iconColor;


  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    handleMenuClose();
    if (window.confirm(`Are you sure you want to delete ${node.data.name}?`)) {
      const key = node.data.isFolder ? `${node.id}/` : node.id;
      await tree.props.onDelete(key);
    }
  };

  const handleRename = () => {
    handleMenuClose();
    if (node.edit) {
      node.edit();
    } else {
      console.error("Edit method not found. Make sure you have passed the correct props to the tree component.");
    }
  };

  return (
    <div
      className={`node-container flex-row ${node.state.isSelected ? "isSelected" : ""} `}
      style={style}
      ref={dragHandle}
    >
      <div
        className="node-content"
        onClick={() => node.isInternal && node.toggle()}
      >
        {node.isLeaf ? (
          <>
            <span className="arrow"></span>
            <span className="file-folder-icon hidden">
              {CustomIcon ? (
                <CustomIcon color={iconColor ? iconColor : "#6bc7f6"} />
              ) : (
                <FileIcon size={12}/>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="arrow">
              {node.isOpen ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}
            </span>
           
          </>
        )}
        <span className="node-text" title={node.data.name}>
          {node.isEditing ? (
            <input
              type="text"
              defaultValue={node.data.name}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={() => node.reset()}
              onKeyDown={(e) => {
                if (e.key === "Escape") node.reset();
                if (e.key === "Enter") node.submit(e.currentTarget.value);
              }}
              autoFocus
            />
          ) : (
            <span className = "text-xs">{node.data.name}</span>
          )}
        </span>
      </div>

      <div className="file-actions absolute right-0">
        <div className="folderFileActions mr-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="bg-white p-1 rounded-lg shadow-2xl " >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRename}>
                <MdEdit className="mr-2" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete}>
                <RxCross2 className="mr-2" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default Node;