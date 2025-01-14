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
import { usePathname } from 'next/navigation';
import { post } from 'aws-amplify/api';
import { useS3Store } from '../fileService';

const Node = ({ node, style, dragHandle, tree }: { node: any; style: any; dragHandle?: any; tree: any; }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const CustomIcon = node.data.icon;
  const iconColor = node.data.iconColor;
  const pathname = usePathname();
  const bucketUuid = pathname.split('/').pop() || '';
  const { objects, isLoading, fetchObjects } = useS3Store();
  

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    handleMenuClose();
    if (window.confirm(`Are you sure you want to delete ${node.data.name}?`)) {
      const key = node.data.isFolder ? `${node.id}/` : node.id;
      await deleteItem(key);
    }
  };

    const deleteItem = async (key: string) => {
      try {
        const response = await post({
          apiName: 'S3_API',
          path: `/s3/${bucketUuid}/delete-url`,
          options: {
            withCredentials: true,
            queryParams: {
              key: key // e.g. 'documents/file.pdf' or 'documents/subfolder/'
            }
          }
        });
  
        const { body } = await response.response;
        const result = await body.json();
  
        console.log('Item deleted successfully:', result);
        await fetchObjects(bucketUuid);
        return result;
  
      } catch (error) {
        console.error('Error deleting item:', error);
        throw error;
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

  const handleSubmit = async (newName: string) => {
    let oldPath = node.data.id;
    const pathParts = oldPath.split('/');
    pathParts[pathParts.length - 1] = newName;
    let newPath = pathParts.join('/');

    console.log('Old path:', oldPath);
    console.log('New path:', newPath);
    if(node.data.isFolder) {
      newPath += '/';
      oldPath += '/';
    }

    console.log('Old path:', oldPath);
    
    try {
      await renameFile(oldPath, newPath);
      node.submit(newName);
    } catch (error) {
      console.error('Error renaming file:', error);
      node.reset();
    }
  };

    const renameFile = async (sourceKey: string, destinationKey: string) => {
      try {
        const response = await post({
          apiName: 'S3_API',
          path: `/s3/${bucketUuid}/move-url`,
          options: {
            withCredentials: true,
            body: {
              sourceKey: sourceKey,      
              destinationKey: destinationKey
            }
          }
        });
  
        const { body } = await response.response;
        const result = await body.json();
  
        console.log('File moved successfully:', result);
        await fetchObjects(bucketUuid);
        return result;
  
      } catch (error) {
        console.error('Error moving file:', error);
        throw error;
      }
    };

  return (
    <div
      className={`node-container flex-row dark:hover:bg-slate-900 ${node.state.isSelected ? "dark:bg-slate-900" : ""} `}
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
                <FileIcon size={12} className = "dark:text-white"/>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="arrow">
              {node.isOpen ? <ChevronDown size={15} className='dark:text-white'/> : <ChevronRight size={15} className='dark:text-white'/>}
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
                if (e.key === "Enter") handleSubmit(e.currentTarget.value);
              }}
              autoFocus
            />
          ) : (
            <span className = "text-xs dark:text-white">{node.data.name}</span>
          )}
        </span>
      </div>

      <div className="file-actions absolute right-0">
        <div className="folderFileActions mr-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="bg-white dark:bg-darkbg p-1 rounded-lg shadow-2xl " 
              onClick={() => node.edit()}>
                <MoreHorizontal className="h-4 w-4 dark:text-white" />
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