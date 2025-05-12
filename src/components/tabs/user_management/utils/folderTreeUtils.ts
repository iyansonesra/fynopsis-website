import { Node } from '../static_folder_tree/static-folder-tree';
import type { FilePermission } from '../CollaboratorsTypes';
import { useFolderStructureStore } from '@/components/tabs/user_management/utils/folderStructureStore';

// Function to get all node IDs (recursive)
export const getAllNodeIds = (node: Node): string[] => {
    const ids: string[] = [];
    // Use node.id if available, otherwise generate a consistent ID
    const nodeId = node.id || (node.path ? `${node.path}/${node.name}` : node.name);
    ids.push(nodeId);
    
    if (node.nodes) {
        node.nodes.forEach(child => {
            ids.push(...getAllNodeIds(child));
        });
    }
    return ids;
};

// Function to get parent IDs (recursive)
export const getParentIds = (node: Node, targetId: string): string[] => {
    if (!node.nodes) return [];
    
    const nodeId = node.id || (node.path ? `${node.path}/${node.name}` : node.name);
    
    for (const child of node.nodes) {
        const childId = child.id || (child.path ? `${child.path}/${child.name}` : child.name);
        if (childId === targetId) {
            return nodeId ? [nodeId] : [];
        }
        const parentIds = getParentIds(child, targetId);
        if (parentIds.length > 0) {
            return nodeId ? [...parentIds, nodeId] : parentIds;
        }
    }
    return [];
};

// Function to handle checkbox selection (with children and parents)
export const handleCheckboxSelect = (
    node: Node,
    isSelected: boolean,
    selectedItems: Set<string>,
    setSelectedItems: (items: Set<string>) => void,
    setSelectedNodeId: (id: string | null) => void,
    folderStructure: Node[],
    onNodeSelect?: (node: Node) => void
) => {
    console.log("=== Starting handleCheckboxSelect ===");
    console.log("Node:", node.name, "ID:", node.id);
    console.log("Is Selected:", isSelected);
    console.log("Current selectedItems:", Array.from(selectedItems));
    
    const newSelectedItems = new Set(selectedItems);
    const childIds = getAllNodeIds(node);
    const nodeId = node.id || (node.path ? `${node.path}/${node.name}` : node.name);
    
    console.log("Child IDs:", childIds);
    console.log("Node ID:", nodeId);
    
    // Get the folder structure store
    const { 
        folderPermissions, 
        filePermissions, 
        setFolderPermissions, 
        setFilePermissions 
    } = useFolderStructureStore.getState();
    
    // Update the selected node ID to highlight this item
    setSelectedNodeId(nodeId);
    console.log("Updated selectedNodeId to:", nodeId);
    
    // First, update the current node's visibility in memory
    node.show = isSelected;
    console.log("Updated node.show to:", isSelected);

    // Update permissions in the store
    const updatePermissions = (nodeId: string, isFolder: boolean, viewAccess: boolean) => {
        console.log("Updating permissions for:", nodeId, "isFolder:", isFolder, "viewAccess:", viewAccess);
        if (isFolder) {
            const currentPerms = folderPermissions.get(nodeId);
            if (currentPerms) {
                const newPerms = { ...currentPerms, viewAccess };
                const newMap = new Map(folderPermissions);
                newMap.set(nodeId, newPerms);
                setFolderPermissions(newMap);
                console.log("Updated folder permissions:", newPerms);
            }
        } else {
            const currentPerms = filePermissions.get(nodeId);
            if (currentPerms) {
                const newPerms = { ...currentPerms, viewAccess };
                const newMap = new Map(filePermissions);
                newMap.set(nodeId, newPerms);
                setFilePermissions(newMap);
                console.log("Updated file permissions:", newPerms);
            }
        }
    };

    // Update the node and its children in selectedItems set and permissions
    if (isSelected) {
        console.log("Adding node and children to selectedItems");
        // Add the node and its children
        childIds.forEach(id => newSelectedItems.add(id));
        
        // Check and add parents if needed
        const parentIds = getParentIds(folderStructure[0], nodeId);
        console.log("Parent IDs:", parentIds);
        parentIds.forEach(parentId => {
            if (!newSelectedItems.has(parentId)) {
                newSelectedItems.add(parentId);
            }
        });

        // Update parent nodes' visibility and permissions without changing selectedItem
        parentIds.forEach(parentId => {
            const findNode = (searchNode: Node, targetId: string): Node | null => {
                const searchNodeId = searchNode.id || (searchNode.path ? `${searchNode.path}/${searchNode.name}` : searchNode.name);
                if (searchNodeId === targetId) return searchNode;
                if (!searchNode.nodes) return null;
                for (const child of searchNode.nodes) {
                    const found = findNode(child, targetId);
                    if (found) return found;
                }
                return null;
            };

            const parentNode = findNode(folderStructure[0], parentId);
            if (parentNode) {
                console.log("Updating parent node:", parentNode.name);
                // Update parent visibility in memory
                parentNode.show = true;
                
                // Update parent permissions
                if (parentNode.id) {
                    updatePermissions(parentNode.id, true, true);
                }
            }
        });
    } else {
        console.log("Removing node and children from selectedItems");
        // Remove the node and its children
        childIds.forEach(id => newSelectedItems.delete(id));
    }
    
    console.log("New selectedItems:", Array.from(newSelectedItems));
    setSelectedItems(newSelectedItems);

    // Create a mapping of all affected nodes for efficient updates
    const updateNodeAndChildren = (currentNode: Node, visibility: boolean) => {
        console.log("Updating node and children:", currentNode.name, "visibility:", visibility);
        // First, update the node in memory
        currentNode.show = visibility;
        
        // Update permissions in the store
        if (currentNode.id) {
            updatePermissions(currentNode.id, currentNode.isFolder || false, visibility);
        }
        
        // Only call onNodeSelect for the actual selected node
        if (onNodeSelect && currentNode.id === nodeId) {
            console.log("Calling onNodeSelect for:", currentNode.name);
            onNodeSelect({
                ...currentNode,
                show: visibility
            });
        }
        
        // If it's a folder, only update direct file children, not subfolder children
        if (currentNode.nodes) {
            currentNode.nodes.forEach(child => {
                // Only update the child if it's a file, not a folder
                if (!child.isFolder && !child.nodes) {
                    console.log("Updating file child:", child.name);
                    // Update files only
                    child.show = visibility;
                    
                    // Update file permissions
                    if (child.id) {
                        updatePermissions(child.id, false, visibility);
                    }
                } else if (child.isFolder === true) {
                    console.log("Updating folder child:", child.name);
                    // For folder children, just update the visibilityMap entry but don't recursively update their children
                    child.show = visibility;
                    
                    // Update folder permissions
                    if (child.id) {
                        updatePermissions(child.id, true, visibility);
                    }
                }
            });
        }
    };
    
    // Apply the visibility change to the node and all its children
    updateNodeAndChildren(node, isSelected);
    
    console.log("=== Completed handleCheckboxSelect ===");
    return newSelectedItems;
};

export const findDeviators = (folderStructure: Node[], permissions: Record<string, FilePermission>): string[] => {
    const deviators: string[] = [];

    const comparePermissions = (fileNode: Node, parentFolder: Node): boolean => {
        if (!fileNode.id || !parentFolder.id || !permissions[fileNode.id] || !permissions[parentFolder.id]) return false;

        console.log('fileNode', fileNode);
        console.log('parentFolder', parentFolder);
        const filePermissions = permissions[fileNode.id];
        const folderPermissions = permissions[parentFolder.id];
        
        console.log('filePermissions', filePermissions);
        console.log('folderPermissions', folderPermissions);
        console.log("--------------------------------");
        // List of permissions to compare for files
        const comparablePermissions: (keyof FilePermission)[] = [
            // 'viewAccess',
            // 'watermarkContent',
            'deleteAccess',
            'editAccess',
            'viewComments',
            'addComments',
            'downloadAccess',
            'viewTags',
            'addTags',
            'canQuery',
            'isVisible',
            'moveAccess',
            'renameAccess'
        ];

        // Check if any permission differs from parent folder's child permissions
        return comparablePermissions.some(permission => 
            filePermissions[permission] !== folderPermissions[permission]
        );

    };

    const traverse = (nodes: Node[]) => {
        nodes.forEach(node => {
            if (node.nodes) {
                // This is a folder, check its file children
                node.nodes.forEach(child => {
                    if (!child.isFolder && child.id) {
                        const isDeviator = comparePermissions(child, node);
                        if (isDeviator) {
                            deviators.push(child.id);
                        }
                    }
                });
                // Continue traversing for nested folders
                traverse(node.nodes);
            }
        });
    };

    traverse(folderStructure);
    return deviators;
}; 