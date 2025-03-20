declare module 'react-grid-layout' {
  import * as React from 'react';
  
  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    isDraggable?: boolean;
    isResizable?: boolean;
    isBounded?: boolean;
    static?: boolean;
  }
  
  export interface Layouts {
    [key: string]: Layout[];
  }
  
  export interface ReactGridLayoutProps {
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    autoSize?: boolean;
    cols?: number;
    draggableCancel?: string;
    draggableHandle?: string;
    verticalCompact?: boolean;
    compactType?: 'vertical' | 'horizontal' | null;
    layout?: Layout[];
    margin?: [number, number];
    containerPadding?: [number, number];
    rowHeight?: number;
    maxRows?: number;
    isBounded?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    preventCollision?: boolean;
    useCSSTransforms?: boolean;
    transformScale?: number;
    resizeHandles?: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>;
    onLayoutChange?: (layout: Layout[]) => void;
  }
  
  export interface ResponsiveProps extends ReactGridLayoutProps {
    breakpoint?: string;
    breakpoints?: {[key: string]: number};
    cols?: {[key: string]: number};
    layouts?: Layouts;
    width?: number;
    onBreakpointChange?: (breakpoint: string, cols: number) => void;
    onLayoutChange?: (layout: Layout[], layouts: Layouts) => void;
    onWidthChange?: (width: number, margin: [number, number], cols: number, containerPadding: [number, number]) => void;
  }
  
  export default class ReactGridLayout extends React.Component<ReactGridLayoutProps> {}
  
  export class Responsive extends React.Component<ResponsiveProps> {}
  
  export function WidthProvider<P>(component: React.ComponentType<P>): React.ComponentType<P>;
} 