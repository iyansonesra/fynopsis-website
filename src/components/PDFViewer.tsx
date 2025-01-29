import React, { useRef, useEffect } from 'react';
import {
  PdfViewerComponent, Toolbar, Magnification, Navigation,
  LinkAnnotation, BookmarkView, ThumbnailView, Print,
  TextSelection, TextSearch, Annotation, FormFields,
  FormDesigner, Inject
} from '@syncfusion/ej2-react-pdfviewer';
import styled from 'styled-components';
import "@cyntler/react-doc-viewer/dist/index.css";
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";



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

  const docs = [
    { uri: documentUrl },
  ];

  useEffect(() => {
    console.log('PDFViewer render');
    console.log('documentUrl:', documentUrl);

    return () => {
      // Cleanup on unmount
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, []);


  return (
    <ViewerContainer>
      <DocViewer documents={docs} pluginRenderers={DocViewerRenderers} />
    </ViewerContainer>
  );
};

export default PDFViewer;
