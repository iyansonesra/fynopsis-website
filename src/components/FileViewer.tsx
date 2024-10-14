import React, { useEffect, useRef, useState } from 'react';
import { Tree, NodeApi, NodeRendererProps } from 'react-arborist';
import { Folder, File, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import WebViewer from "@pdftron/webviewer";

interface FileViewerProps {
    fileUrl: string;
}

const FileViewer: React.FC<FileViewerProps> = ({ fileUrl }) => {
    const viewerDiv = useRef<HTMLDivElement>(null);

    useEffect(() => {
        console.log('fileUrl', fileUrl);
            WebViewer(
                {
                    path: 'lib',
                    initialDoc: fileUrl,
                },
                viewerDiv.current as HTMLDivElement
            ).then((instance) => {
            });
        
    }, [fileUrl]);

    return (
        <div className="h-full w-full">
            <div className="webviewer h-full w-full" ref={viewerDiv}></div>
        </div>
    );
};

export default FileViewer;