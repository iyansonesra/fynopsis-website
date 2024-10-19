import React, { useEffect, useRef, useState } from 'react';
import WebViewer from "@pdftron/webviewer";

interface FileViewerProps {
    fileUrl: string;
}

const FileViewer: React.FC<FileViewerProps> = ({ fileUrl }) => {
    const viewerDiv = useRef<HTMLDivElement>(null);
    const viewerInstance = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;

        const initializeViewer = async () => {
            // Only initialize WebViewer once
            if (!viewerInstance.current && viewerDiv.current) {
                try {
                    viewerInstance.current = await WebViewer(
                        {
                            path: 'lib',
                            initialDoc: fileUrl,
                        },
                        viewerDiv.current
                    );
                } catch (error) {
                    console.error('Error initializing WebViewer:', error);
                }
            } else if (viewerInstance.current) {
                // If viewer is already initialized, just load the new document
                const { Core } = viewerInstance.current;
                try {
                    await Core.documentViewer.loadDocument(fileUrl);
                } catch (error) {
                    console.error('Error loading document:', error);
                }
            }
        };

        initializeViewer();

        return () => {
            isMounted = false;
            // Clean up WebViewer instance when component unmounts
            if (viewerInstance.current) {
                const { Core } = viewerInstance.current;
                // Close the current document
                if (Core.documentViewer) {
                    Core.documentViewer.closeDocument();
                }
                // Remove the UI
                if (viewerDiv.current) {
                    viewerDiv.current.innerHTML = '';
                }
                viewerInstance.current = null;
            }
        };
    }, []);

    // Handle fileUrl changes after initial mount
    useEffect(() => {
        if (viewerInstance.current) {
            const { Core } = viewerInstance.current;
            Core.documentViewer.loadDocument(fileUrl);
        }
    }, [fileUrl]);

    return (
        <div className="h-full w-full">
            <div className="webviewer h-full w-full" ref={viewerDiv}></div>
        </div>
    );
};

export default FileViewer;