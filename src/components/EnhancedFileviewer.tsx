import React, { useEffect, useState } from 'react';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Helper function to get file type from URL or name
const getFileType = (url: string, name?: string) => {
  // First try to get it from the name
  if (name) {
    const extension = name.split('.').pop()?.toLowerCase();
    if (extension) {
      switch (extension) {
        case 'pdf': return 'application/pdf';
        case 'doc': return 'application/msword';
        case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'xls': return 'application/vnd.ms-excel';
        case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'ppt': return 'application/vnd.ms-powerpoint';
        case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        default: return `application/${extension}`;
      }
    }
  }
  
  // If no name, try to get it from the URL
  const urlExtension = url.split('.').pop()?.split('?')[0].toLowerCase();
  if (urlExtension) {
    return `application/${urlExtension}`;
  }
  
  return 'application/octet-stream'; // Default type
};

// Custom renderer using Google Docs Viewer
const GoogleDocsRenderer = ({ mainState: { currentDocument } }: any) => {
  if (!currentDocument?.uri) return null;
  
  const googleDocsViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
    currentDocument.uri
  )}&embedded=true`;
  
  return (
    <iframe
      className="w-full h-full min-h-[500px]"
      src={googleDocsViewerUrl}
      frameBorder="0"
    />
  );
};

// Define supported file types for Google Docs Viewer
GoogleDocsRenderer.fileTypes = [
  "pdf", "application/pdf",
  "doc", "application/msword",
  "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "xls", "application/vnd.ms-excel",
  "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "ppt", "application/vnd.ms-powerpoint",
  "pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"
];
GoogleDocsRenderer.weight = 1;

interface FileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl?: string;
  documentName?: string;
}

const EnhancedFileViewer: React.FC<FileViewerProps> = ({
  isOpen,
  onClose,
  documentUrl,
  documentName
}) => {
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    setError(null); // Reset error when URL changes
  }, [documentUrl]);

  if (!documentUrl) return null;

  const fileType = getFileType(documentUrl, documentName);
  
  const documents = [{
    uri: documentUrl,
    fileType: fileType
  }];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh]">
        <DialogHeader>
          <DialogTitle>{documentName || 'Document Viewer'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full h-full min-h-[60vh]">
            <DocViewer
                documents={documents}
                pluginRenderers={[GoogleDocsRenderer, ...DocViewerRenderers]}
                style={{ height: '100%' }}
                config={{
                header: {
                    disableHeader: true,
                    disableFileName: true,
                }
                }}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedFileViewer;