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

const PDFViewer: React.FC<PDFViewerProps> = ({ documentUrl }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <PDFContainer>
      {!isLoaded && <div className="loading">Loading document...</div>}
      <iframe
        src={documentUrl}
        onLoad={() => setIsLoaded(true)}
        style={{ display: isLoaded ? 'block' : 'none' }}
        title="PDF Viewer"
      />
    </PDFContainer>
  );
};

export default PDFViewer;
