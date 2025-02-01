import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const PDFContainer = styled.div`
  // width: 100%;
  // height: 94vh;
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

interface PDFViewerProps {
  documentUrl: string;
  containerId?: string;
  maxRetries?: number;
  checkInterval?: number;
}

const getFileType = (url: string): string => {
  const baseUrl = url.split('?')[0];
  return baseUrl.split('.').pop()?.toLowerCase() || '';
};

const getViewerUrl = (documentUrl: string): string => {
  const fileType = getFileType(documentUrl);
  const encodedUrl = encodeURIComponent(documentUrl);
  
  switch(fileType) {
    case 'xlsx':
    case 'xls':
    case 'csv':
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    case 'doc':
    case 'docx':
    case 'ppt':
    case 'pptx':
    case 'pdf':
    default:
      return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
  }
};

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  documentUrl, 
  containerId,
  maxRetries = 5,
  checkInterval = 2000 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const fileType = getFileType(documentUrl);
  const viewerUrl = getViewerUrl(documentUrl);
  const isOfficeFile = ['xlsx', 'xls', 'csv'].includes(fileType);


  useEffect(() => {
    let checkTimer: NodeJS.Timeout;
    let mounted = true;

    const checkIframeContent = () => {
      if (!mounted || !iframeRef.current) return;

      // For Office files, we only need to check if iframe is loaded
      if (isOfficeFile) {
        setIsLoading(false);
        clearInterval(checkTimer);
        return;
      }

      try {
        const iframeDoc = iframeRef.current.contentDocument || 
                         iframeRef.current.contentWindow?.document;
        
        if (!iframeDoc || iframeDoc.body.children.length === 0) {
          if (retryCount < maxRetries) {
            console.log('Reloading document...');
            setRetryCount(prev => prev + 1);
            iframeRef.current.src = viewerUrl;
          } else {
            setIsLoading(false);
            clearInterval(checkTimer);
          }
        } else {
          setIsLoading(false);
          clearInterval(checkTimer);
        }
      } catch (error) {
        console.log('Checking iframe content failed:', error);
      }
    };

    checkTimer = setInterval(checkIframeContent, checkInterval);

    return () => {
      mounted = false;
      clearInterval(checkTimer);
    };
  }, [viewerUrl, retryCount, maxRetries, checkInterval, isOfficeFile]);

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
    <PDFContainer className='flex flex-grow bg-green-100 h-full w-inherit'>
      {(isLoading && isOfficeFile) && <div className="loader">Loading document...</div>}
      <iframe
        ref={iframeRef}
        src={viewerUrl}
        onLoad={handleLoad}
        title="Document Viewer"
      />
    </PDFContainer>
  );
};

export default PDFViewer;
