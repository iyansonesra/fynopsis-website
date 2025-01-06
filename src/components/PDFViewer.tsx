import React, { useRef, useEffect } from 'react';
import {
  PdfViewerComponent, Toolbar, Magnification, Navigation,
  LinkAnnotation, BookmarkView, ThumbnailView, Print,
  TextSelection, TextSearch, Annotation, FormFields,
  FormDesigner, Inject
} from '@syncfusion/ej2-react-pdfviewer';
import styled from 'styled-components';


const ViewerContainer = styled.div`
  width: 100%;
  height: 100%;

  .e-pv-viewer-container::-webkit-scrollbar {
    width: 10px;
  }

  .e-pv-viewer-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  .e-pv-viewer-container::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 10px;
  }

  .e-pv-viewer-container::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

interface PDFViewerProps {
  documentUrl: string;
  height?: string;
  containerId: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  documentUrl,
  height = '640px',
  containerId
}) => {
  const viewerRef = useRef<PdfViewerComponent>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, []);

  return (
    <ViewerContainer>
      <PdfViewerComponent
        ref={viewerRef}
        documentPath={documentUrl}
        serviceUrl="https://services.syncfusion.com/react/production/api/pdfviewer"
        enableDownload={true}
        enablePrint={true}
        height={'100%'}
        width={'100%'}
      >
        <Inject services={[
          Toolbar,
          Magnification,
          Navigation,
          Annotation,
          LinkAnnotation,
          BookmarkView,
          ThumbnailView,
          Print,
          TextSelection,
          TextSearch,
          FormFields,
          FormDesigner
        ]} />
      </PdfViewerComponent>
    </ViewerContainer>
  );
};

export default PDFViewer;
