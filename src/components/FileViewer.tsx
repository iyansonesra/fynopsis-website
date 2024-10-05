// import React, { useState, useEffect } from 'react';
// import { Worker, Viewer } from '@react-pdf-viewer/core';
// import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
// import * as XLSX from 'xlsx';
// import mammoth from 'mammoth';
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { X } from "lucide-react";
// import '@react-pdf-viewer/core/lib/styles/index.css';
// import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// const FileViewer = ({ fileUrl, fileType, onClose }) => {
//   const [content, setContent] = useState(null);
//   const defaultLayoutPluginInstance = defaultLayoutPlugin();

//   useEffect(() => {
//     const loadFile = async () => {
//       try {
//         const response = await fetch(fileUrl);
//         const blob = await response.blob();

//         switch (fileType.toLowerCase()) {
//           case 'xlsx':
//             const arrayBuffer = await blob.arrayBuffer();
//             const workbook = XLSX.read(arrayBuffer, { type: 'array' });
//             const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
//             const htmlTable = XLSX.utils.sheet_to_html(firstSheet);
//             setContent({ type: 'xlsx', data: htmlTable });
//             break;

//           case 'doc':
//           case 'docx':
//             const arrayBufferDoc = await blob.arrayBuffer();
//             const result = await mammoth.convertToHtml({ arrayBuffer: arrayBufferDoc });
//             setContent({ type: 'doc', data: result.value });
//             break;

//           case 'pdf':
//             setContent({ type: 'pdf', data: URL.createObjectURL(blob) });
//             break;

//           default:
//             console.error('Unsupported file type');
//         }
//       } catch (error) {
//         console.error('Error loading file:', error);
//       }
//     };

//     loadFile();
//   }, [fileUrl, fileType]);

//   const renderContent = () => {
//     if (!content) return <div>Loading...</div>;

//     switch (content.type) {
//       case 'xlsx':
//         return <div dangerouslySetInnerHTML={{ __html: content.data }} />;
      
//       case 'doc':
//         return <div dangerouslySetInnerHTML={{ __html: content.data }} />;
      
//       case 'pdf':
//         return (
//           <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
//             <Viewer
//               fileUrl={content.data}
//               plugins={[defaultLayoutPluginInstance]}
//             />
//           </Worker>
//         );
      
//       default:
//         return <div>Unsupported file type</div>;
//     }
//   };

//   return (
//     <Card className="fixed inset-0 z-50 bg-white overflow-hidden flex flex-col">
//       <div className="flex justify-between items-center p-4 border-b">
//         <h2 className="text-xl font-semibold">File Viewer</h2>
//         <Button variant="ghost" size="icon" onClick={onClose}>
//           <X className="h-4 w-4" />
//         </Button>
//       </div>
//       <div className="flex-1 overflow-auto p-4">
//         {renderContent()}
//       </div>
//     </Card>
//   );
// };

// export default FileViewer;