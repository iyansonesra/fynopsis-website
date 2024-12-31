import React from 'react';
import { AiFillFolder, AiFillFile } from "react-icons/ai";
import { MdArrowRight, MdArrowDropDown, MdEdit } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";

const Node = ({ node, style, dragHandle, tree }) => {
  const CustomIcon = node.data.icon;
  const iconColor = node.data.iconColor;

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${node.data.name}?`)) {
      const key = node.data.isFolder ? `${node.id}/` : node.id;
      await tree.props.onDelete(key);
    }
  };

  return (
    <div
      className={`node-container flex-row ${node.state.isSelected ? "isSelected" : ""}`}
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
                <AiFillFile color="#6bc7f6" />
              )}
            </span>
          </>
        ) : (
          <>
            <span className="arrow">
              {node.isOpen ? <MdArrowDropDown /> : <MdArrowRight />}
            </span>
            <span className="file-folder-icon">
              {CustomIcon ? (
                <CustomIcon color={iconColor ? iconColor : "#f6cf60"} />
              ) : (
                <AiFillFolder color="#f6cf60" />
              )}
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
            <span className = "text-sm">{node.data.name}</span>
          )}
        </span>
      </div>

      <div className="file-actions absolute right-0">
        <div className="folderFileActions">
          <button onClick={() => node.edit()} title="Rename...">
            <MdEdit />
          </button>
          <button onClick={handleDelete} title="Delete">
            <RxCross2 />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Node;