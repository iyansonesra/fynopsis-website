import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { UncontrolledTreeEnvironment, Tree, StaticTreeDataProvider, TreeItem, TreeItemIndex, TreeRef } from 'react-complex-tree';
import 'react-complex-tree/lib/style.css';
import { Folder, File, ChevronRight, ChevronDown, X, Sparkles } from 'lucide-react';

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

  const [search, setSearch] = useState('pizza');
  const tree = useRef<TreeRef>(null);

  const dataProvider = useMemo(
    () =>
      new StaticTreeDataProvider(longTree.items, (item, data) => ({
        ...item,
        data,
      })),
    []
  );

  const findItemPath = useCallback(
    async (search: string, searchRoot: TreeItemIndex = 'root') => {
      const item = await dataProvider.getTreeItem(searchRoot);
      if (item.data.toLowerCase().includes(search.toLowerCase())) {
        return [item.index];
      }
      const searchedItems = await Promise.all(
        item.children?.map(child => findItemPath(search, child)) ?? []
      );
      const result = searchedItems.find(item => item !== null);
      if (!result) {
        return null;
      }
      return [item.index, ...result];
    },
    [dataProvider]
  );

  const find = useCallback(
    e => {
      e.preventDefault();
      if (search) {
        findItemPath(search).then(path => {
          if (path) {
            // wait for full path including leaf, to make sure it loaded in
            tree.current?.expandSubsequently(path).then(() => {
              tree.current?.selectItems([path[path.length - 1]]);
              tree.current?.focusItem(path[path.length - 1]);
            });
          }
        });
      }
    },
    [findItemPath, search]
  );

  const handleClearFileSearch = () => {
    setSearch('');
};

  return (
    <>
      <style>{`
        :root {
          --rct-color-tree-bg: transparent;
  --rct-item-height: 28px;
  --rct-color-search-highlight-bg: transparent;

  --rct-color-tree-focus-outline: transparent;
  --rct-item-margin: 1px;
  --rct-item-padding: 8px;
  --rct-radius: 4px;
  --rct-bar-offset: 0px;
  --rct-bar-width: 0px;
  --rct-bar-color: transparent;
  --rct-focus-outline: #000000;

  --rct-color-focustree-item-selected-bg: #f0f2f5;
  --rct-color-focustree-item-hover-bg: #f0f2f5;
  --rct-color-focustree-item-hover-text: transparent;
  --rct-color-focustree-item-active-bg: transparent;
  --rct-color-focustree-item-active-text: #4f4f4f;

  --rct-arrow-size: 10px;
  --rct-arrow-container-size: 16px;
  --rct-arrow-padding: 6px;

  --rct-cursor: pointer;

  --rct-search-width: 120px;
  --rct-search-height: 16px;
  --rct-search-padding: 8px;
  --rct-search-border: #b4b7bd;
  --rct-search-border-bottom: #0366d6;
  --rct-search-bg: #f8f9fa;
  --rct-search-text: #000000;
  --rct-search-text-offset: calc(var(--rct-search-padding) * 2 + 16px);
        }
      `}</style>
       <form onSubmit={find} className="relative ">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Sparkles className="h-5 w-5 text-blue-400" />
        </div>
        <input
          className='w-full h-10 border-2 rounded-xl pl-10 pr-10 border-slate-400'
          placeholder='Search for a file...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={handleClearFileSearch}
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
        <button type="submit" className="hidden">Find item</button>
      </form>
    
      <UncontrolledTreeEnvironment<string>
        canDragAndDrop
        canDropOnFolder
        canReorderItems
        dataProvider={
          new StaticTreeDataProvider(longTree.items, (item, data) => ({
            ...item,
            data,
          }))
        }
        getItemTitle={item => item.data}
        viewState={{
          'tree-1': {
            expandedItems: [
              'Fruit',
              'Meals',
              'America',
              'Europe',
              'Asia',
              'Desserts',
            ],
          },
        }}
      >
        <Tree
          treeId="tree-1"
          rootItem="root"
          treeLabel="Tree Example"
          ref={tree}
        />
      </UncontrolledTreeEnvironment>

    </>
  );

};

export default FolderTreeComponent;