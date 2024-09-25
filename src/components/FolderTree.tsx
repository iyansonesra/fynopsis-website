import React, { useState, useEffect } from 'react';
import { UncontrolledTreeEnvironment, Tree, StaticTreeDataProvider, TreeItem, TreeItemIndex } from 'react-complex-tree';
import 'react-complex-tree/lib/style.css';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';

interface FolderTreeItem extends TreeItem {
    isFolder: boolean;
}

interface TreeData {
    [key: string]: FolderTreeItem;
}

const shortTreeTemplate = {
    root: {
      container: {
        item0: null,
        item1: null,
        item2: null,
        item3: {
          inner0: null,
          inner1: null,
          inner2: null,
          inner3: null
        },
        item4: null,
        item5: null
      }
    }
  };
  
  const longTreeTemplate = {
    root: {
      Fruit: {
        Apple: null,
        Orange: null,
        Lemon: null,
        Berries: {
          Strawberry: null,
          Blueberry: null
        },
        Banana: null
      },
      Meals: {
        America: {
          SmashBurger: null,
          Chowder: null,
          Ravioli: null,
          MacAndCheese: null,
          Brownies: null
        },
        Europe: {
          Risotto: null,
          Spaghetti: null,
          Pizza: null,
          Weisswurst: null,
          Spargel: null
        },
        Asia: {
          Curry: null,
          PadThai: null,
          Jiaozi: null,
          Sushi: null
        },
        Australia: {
          PotatoWedges: null,
          PokeBowl: null,
          LemonCurd: null,
          KumaraFries: null
        }
      },
      Desserts: {
        Cookies: null,
        IceCream: null
      },
      Drinks: {
        PinaColada: null,
        Cola: null,
        Juice: null
      }
    }
  };

const readTemplate = (template: any, data: any = { items: {} }) => {
    for (const [key, value] of Object.entries(template)) {
      data.items[key] = {
        index: key,
        canMove: true,
        isFolder: value !== null,
        children: value !== null ? Object.keys(value as object) : undefined,
        data: key,
        canRename: true
      };
  
      if (value !== null) {
        readTemplate(value, data);
      }
    }
    return data;
  };

const longTree = readTemplate(longTreeTemplate);
const shortTree = readTemplate(shortTreeTemplate);

interface FolderTreeComponentProps {
    searchQuery: string;
}

const FolderTreeComponent: React.FC<FolderTreeComponentProps> = () => {
    return (
        <UncontrolledTreeEnvironment
        dataProvider={
          new StaticTreeDataProvider(longTree.items, (item, data) => ({
            ...item,
            data,
          }))
        }
        getItemTitle={(item) => item.data}
        canDragAndDrop={true}
        canReorderItems={true}
        canDropOnFolder={true}
        canDropOnNonFolder={true}
        viewState={{
          "tree-1": {
            expandedItems: ["Fruit"],
          },
        }}
      >
        <Tree treeId="tree-1" rootItem="root" treeLabel="Tree Example" />
      </UncontrolledTreeEnvironment>
    );
};

export default FolderTreeComponent;