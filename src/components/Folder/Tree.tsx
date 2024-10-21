import React, { useRef, useState } from "react";
import { Tree, TreeApi } from "react-arborist";
import { data } from "./Data";
import Node from "./Node";
import { TbFolderPlus } from "react-icons/tb";
import { AiOutlineFileAdd } from "react-icons/ai";

interface TreeFolderProps {
  onFileSelect: (file: any) => void;
}

const TreeFolder: React.FC<TreeFolderProps> = ({ onFileSelect }) => {
  const [term, setTerm] = useState<string>("");
  const treeRef = useRef(null);

  const handleNodeClick = (node) => {
    if (!node.isFolder) {
      onFileSelect(node.data);
    }
  };



  const createFileFolder = (
    <>
      <button
        onClick={() => treeRef.current?.createInternal()}
        title="New Folder..."
      >
        <TbFolderPlus />
      </button>
      <button onClick={() => treeRef.current?.createLeaf()} title="New File...">
        <AiOutlineFileAdd />
      </button>
    </>
  );

  return (
    <div className=" overflow-hidden">
      <input
        type="text"
        placeholder="Search..."
        className="search-input"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <div className="ml-2 folderFileActions mb-2">{createFileFolder}</div>
      <div className="tree-container">
        <Tree
          ref={treeRef}
          initialData={data}
          width={"100%"}
          indent={24}
          rowHeight={32}
          searchTerm={term}
          searchMatch={(node, term) =>
            node.data.name.toLowerCase().includes(term.toLowerCase())
          }
          onActivate={handleNodeClick}
        >
          {Node}
        </Tree>
      </div>

    </div>
  );
};

export default TreeFolder;