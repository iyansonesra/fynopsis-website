import React, { useState } from 'react';
import styled from 'styled-components';

const PDFContainer = styled.div`
  width: 100%;
  height: 100vh;
  position: relative;
  
  iframe {
    border: none;
    width: 100%;
    height: 100%;
  }

  .loading {
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
}

const getFileType = (url: string): string => {
  // Remove query parameters and get base URL
  const baseUrl = url.split('?')[0];
  return baseUrl.split('.').pop()?.toLowerCase() || '';
};

const getViewerUrl = (documentUrl: string): string => {
  const fileType = getFileType(documentUrl);
  const encodedUrl = encodeURIComponent(documentUrl);
  
  switch(fileType) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'ppt':
    case 'pptx':
      return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
    case 'xlsx':
    case 'xls':
      // return `http://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}&embedded=true`;
    
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}&embedded=true`;
    default:
      return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
  }
};

const PDFViewer: React.FC<PDFViewerProps> = ({ documentUrl }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // var encodedUrl = encodeURIComponent(documentUrl);
  // var iFrameUrl = 'http://view.officeapps.live.com/op/view.aspx?src=' + encodedUrl + '&embedded=true'; //'https://docs.google.com/viewer?url=' + encodedUrl + '&embedded=true';
  const iFrameUrl = getViewerUrl(documentUrl);
  
  console.log(iFrameUrl);
  return (
    <PDFContainer>
      {/* {!isLoaded && <div className="loading">Loading document...</div>} */}
      <iframe
        src={iFrameUrl}
        // onLoad={() => setIsLoaded(true)}
        // style={{ display: isLoaded ? 'block' : 'none' }}
        title="PDF Viewer"
      />
    </PDFContainer>
  );
};

export default PDFViewer;
