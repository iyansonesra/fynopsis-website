import React, { useRef, useEffect, useState } from 'react';
import {
  PdfViewerComponent, Toolbar, Magnification, Navigation,
  LinkAnnotation, BookmarkView, ThumbnailView, Print,
  TextSelection, TextSearch, Annotation, FormFields,
  FormDesigner, Inject
} from '@syncfusion/ej2-react-pdfviewer';
import styled from 'styled-components';

const ViewerContainer = styled.div`
   height: 100%;
  width: 100%;
  flex-grow: 1;
  display: flex; /* Add this */
  flex-direction: column; /* Add this */

  /* Make sure PdfViewerComponent takes the full space */
  .e-pdfviewer {
    height: 100% !important;
    width: 100% !important;
    display: flex;
    flex-direction: column;
  }

  /* Ensure the content area fills available space */
  .e-pv-viewer-container {
    flex: 1;
  }
  

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
  searchPhrase?: string; // New prop for the search phrase
  containerId?: string; // New prop for unique ID

}

const BasicPDFViewer: React.FC<PDFViewerProps> = ({
  documentUrl,
  searchPhrase = '',
  containerId = `pdf-viewer-${Math.random().toString(36).substr(2, 9)}`, // Generate random ID if none provided

}) => {
  const viewerRef = useRef<PdfViewerComponent>(null);
  const [isDocumentLoaded, setIsDocumentLoaded] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Load document function
  const loadDocument = () => {
    if (viewerRef.current) {
      // Set the service URL
      viewerRef.current.resourceUrl = "https://cdn.syncfusion.com/ej2/26.2.11/dist/ej2-pdfviewer-lib";
      // Bind the data
      viewerRef.current.dataBind();
      // Load the document with the URL
      viewerRef.current.load(documentUrl, ''); // Passing empty string as password
    }
  };

  useEffect(() => {
    // Auto-load the document when the component mounts
    if (viewerRef.current && !isDocumentLoaded) {
      loadDocument();
    }

    // Cleanup on unmount
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, [documentUrl]);

  // Add search functionality when document is loaded and searchPhrase is provided
// Add search functionality when document is loaded and searchPhrase is provided
// Add search functionality when document is loaded and searchPhrase is provided
useEffect(() => {
  if (isDocumentLoaded && viewerRef.current && searchPhrase && !searchPerformed) {
    
    // Use a longer timeout to ensure the PDF is fully rendered and DOM elements are available
    const timer = setTimeout(() => {
      if (viewerRef.current && viewerRef.current.element) {
        try {
          // Check if viewer is properly initialized
          
          // Initialize the search module
          const searchModule = viewerRef.current.textSearchModule;
          if (searchModule) {
            
            // Add event listeners to track search results
            viewerRef.current.textSearchComplete = (args: any) => {
              if (args.searchText === searchPhrase) {
                if (args.matchesCount > 0) {
                } else {
                }
              }
            };
            
            // Make sure DOM is ready before searching
            if (document.getElementById('container')) {
              searchModule.searchText(searchPhrase, false); // false = don't match case
              setSearchPerformed(true);
            } else {
              console.error('PDF viewer container not found in DOM');
            }
          } else {
            console.error('Search module not available');
          }
        } catch (error) {
          console.error('Error during search process:', error);
        }
      } else {
        console.error('PDF viewer reference not available or not properly initialized');
      }
    }, 1500); // Increased timeout to ensure PDF is fully rendered
    
    return () => clearTimeout(timer);
  }
}, [isDocumentLoaded, searchPhrase, searchPerformed]);
  
  // Reset search when searchPhrase changes
  useEffect(() => {
    if (searchPhrase) {
    }
    setSearchPerformed(false);
  }, [searchPhrase]);

  // Add error handling
  const handleDocumentLoadFailure = (args: any) => {
    console.error('PDF loading failed:', args);
    // You can implement additional error handling here
  };

  // Handler for document load complete
  const handleDocumentLoad = () => {
    setIsDocumentLoaded(true);
  };

  return (
    <ViewerContainer style={{ height: '100%', width: '100%' }}>
      {/* <div className='control-section'> */}
        <PdfViewerComponent
          ref={viewerRef}
          id={containerId}
          documentLoad={handleDocumentLoad}
          resourceUrl="https://cdn.syncfusion.com/ej2/26.2.11/dist/ej2-pdfviewer-lib"
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
          ]}/>
        </PdfViewerComponent>
      {/* </div> */}
    </ViewerContainer>
  );
};

export default BasicPDFViewer;