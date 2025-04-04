import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import PDFHighlighterComponent from './PDFHighlight';
import BasicPDFViewer from './PDFTest';
import PDFHighlighterViewer from './PDFHighlight';
import { IHighlight } from 'react-pdf-highlighter';

const PDFContainer = styled.div`
  display: flex;
  flex-grow: 1;
  height: 100%;
  width: 100%;
  position: relative;

  
  iframe {
    border: none;
    width: 100%;
    height: 100%;
  }

  .loader {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.2rem;
    color: #666;
  }
`;

// Specific container for PDF files
const PDFViewerContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  display: flex; /* Add this */
  overflow: hidden;
  background-color:rgb(212, 36, 36);
`;

interface PDFViewerProps {
  documentUrl: string;
  containerId?: string;
  maxRetries?: number;
  checkInterval?: number;
  tabId: string;
  name: string;
  boundingBoxes: IHighlight[]; // Changed to IHighlight[] type

}

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pageNumber: number;
  text?: string; // Optional text for the highlight
  comment?: string; // Optional comment for the highlight
}

const getFileType = (url: string): string => {
  const baseUrl = url.split('?')[0];
  return baseUrl.split('.').pop()?.toLowerCase() || '';
};

const getViewerUrl = (documentUrl: string): string => {
  const fileType = getFileType(documentUrl);
  const encodedUrl = encodeURIComponent(documentUrl);

  switch (fileType) {
    case 'xlsx':
    case 'xls':
    case 'csv':
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    case 'doc':
    case 'docx':
    case 'ppt':
    case 'pptx':
      return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
    default:
      return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
  }
};

const PDFViewer: React.FC<PDFViewerProps> = ({
  documentUrl,
  containerId,
  maxRetries = 5,
  checkInterval = 2000,
  tabId,
  name,
  boundingBoxes// New prop for external bounding boxes
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fileType = getFileType(name);
  const viewerUrl = getViewerUrl(documentUrl);
  const isOfficeFile = ['xlsx', 'xls', 'csv'].includes(fileType);
  const isPdfFile = fileType === 'pdf';

  console.log("documenturl", documentUrl);
  console.log("doc name", name);
  console.log("file type", fileType);
  console.log("isPdfFile", isPdfFile);
  console.log("bounding boxes", boundingBoxes);

  // useEffect(() => {
  //   // Skip iframe loading checks for PDF files as they're handled by PDFHighlighter
  //   console.log("documenturl", documentUrl);
  //   console.log("doc name", name);
  //   console.log('PDFViewer useEffect', fileType);
  //   console.log('PDFViewer isPDF', isPdfFile);
  //   console.log("bounding boxes", boundingBoxes);
  //   if (isPdfFile) {
  //     setIsLoading(false);
  //     return;
  //   }

  //   let checkTimer: NodeJS.Timeout;
  //   let mounted = true;

  //   const checkIframeContent = () => {
  //     if (!mounted || !iframeRef.current) return;

  //     // For Office files, we only need to check if iframe is loaded
  //     if (isOfficeFile) {
  //       setIsLoading(false);
  //       clearInterval(checkTimer);
  //       return;
  //     }

  //     try {
  //       const iframeDoc = iframeRef.current.contentDocument ||
  //         iframeRef.current.contentWindow?.document;

  //       if (!iframeDoc || iframeDoc.body.children.length === 0) {
  //         if (retryCount < maxRetries) {
  //           console.log('Reloading document...');
  //           setRetryCount(prev => prev + 1);
  //           iframeRef.current.src = viewerUrl;
  //         } else {
  //           setIsLoading(false);
  //           clearInterval(checkTimer);
  //         }
  //       } else {
  //         setIsLoading(false);
  //         clearInterval(checkTimer);
  //       }
  //     } catch (error) {
  //       // console.log('Checking iframe content failed:', error);
  //     }
  //   };

  //   checkTimer = setInterval(checkIframeContent, checkInterval);

  //   return () => {
  //     mounted = false;
  //     clearInterval(checkTimer);
  //   };
  // }, [viewerUrl, retryCount, maxRetries, checkInterval, isOfficeFile, isPdfFile]);

  const handleLoad = () => {
    // For Office files, clear loading state immediately on load
    if (isOfficeFile) {
      setIsLoading(false);
      return;
    }

    if (iframeRef.current) {
      try {
        const iframeDoc = iframeRef.current.contentDocument ||
          iframeRef.current.contentWindow?.document;
        if (iframeDoc && iframeDoc.body.children.length > 0) {
          setIsLoading(false);
        }
      } catch (error) {
        console.log('Load handler failed:', error);
      }
    }
  };
  return (
    <PDFContainer>
      {isPdfFile ? (
        <PDFViewerContainer>
          <PDFHighlighterComponent documentUrl={documentUrl} boundingBoxes={boundingBoxes}/>

        </PDFViewerContainer>

      ) : (
        <>
          {(isLoading && isOfficeFile) && <div className="loader">Loading document...</div>}
          <iframe
            ref={iframeRef}
            src={viewerUrl}
            onLoad={handleLoad}
            title="Document Viewer"
          />
        </>
      )}
    </PDFContainer>
  );
};

export default PDFViewer;