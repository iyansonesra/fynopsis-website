import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Maximize2,
  Printer,
  Share2
} from 'lucide-react';

const PDFViewer = ({ fileUrl }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(100);

  const toggleFullscreen = () => {
    const element = document.documentElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 10, 50));
  };

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No PDF file selected</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Custom Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b">
        <div className="flex items-center space-x-2">
          {/* Page Navigation */}
          <div className="flex items-center space-x-1 mr-4">
            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {currentPage}</span>
            <Button variant="ghost" size="sm" className="hover:bg-gray-100">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" className="hover:bg-gray-100" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-16 text-center">{scale}%</span>
            <Button variant="ghost" size="sm" className="hover:bg-gray-100" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="hover:bg-gray-100">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="hover:bg-gray-100">
            <Printer className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="hover:bg-gray-100"
            onClick={toggleFullscreen}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <Card className="flex-1 overflow-hidden m-2 shadow-lg">
        <div className="w-full h-full bg-white rounded-lg overflow-hidden">
          <embed
            src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            type="application/pdf"
            className="w-full h-full"
            style={{
              transform: `scale(${scale / 100})`,
              transformOrigin: 'top left',
              backgroundColor: 'white',
            }}
          />
        </div>
      </Card>
    </div>
  );
};

export default PDFViewer;