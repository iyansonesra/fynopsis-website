import React, { useEffect, useCallback, useState } from 'react';
import { FiX, FiFile, FiPlus, FiUpload, FiRefreshCw } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { get, post } from 'aws-amplify/api';
import useTranslation from './useTranslation';

const Documents = ({ language = 'en' }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const { t } = useTranslation(language);


  const handleFileList = useCallback(async () => {
    try {
      const restOperation = await get({
        apiName: 'LLAMA_API',
        path: '/data/list',
        options: {
          headers: { 'Content-Type': 'application/json' },
        }
      });
      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      return response.files || [];
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  }, []);

  const handleFileUpload = useCallback(async (file) => {
    try {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64String = reader.result;
            const response = await post({
              apiName: 'LLAMA_API',
              path: '/data',
              options: {
                headers: { 'Content-Type': 'application/json' },
                body: { file: base64String, fileName: file.name }
              }
            });
            resolve(response);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }, []);

  const refreshFileList = async () => {
    setIsLoading(true);
    try {
      const updatedFiles = await handleFileList();
      setFiles(updatedFiles);
    } catch (error) {
      console.error('Error refreshing file list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = useCallback(async (index) => {
    try {
      const fileToRemove = files[index];
      await post({
        apiName: 'LLAMA_API',
        path: '/data/remove',
        options: {
          headers: { 'Content-Type': 'application/json' },
          body: { fileName: fileToRemove.fileName }
        }
      });
      setFiles(files => files.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing file:', error);
    }
  }, [files]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const fileList = await handleFileList();
        setFiles(fileList);
      } catch (error) {
        console.error('Error fetching initial files:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [handleFileList]);

  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = selectedFiles.map(file => handleFileUpload(file));
      await Promise.all(uploadPromises);

      // Add a delay of 1 second (1000 milliseconds) before fetching the updated file list
      setTimeout(async () => {
        const updatedFiles = await handleFileList();
        setFiles(updatedFiles);
        setShowUploadArea(false);
        setIsUploading(false);
      }, 1000);
    } catch (error) {
      console.error('Error uploading files:', error);
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 text-white flex items-center justify-center">
        <p className="text-gray-400">{t('loadingDocuments')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-black">{t('documents')}</h1>
          <button
            onClick={refreshFileList}
            className="text-gray-400 hover:text-white transition-colors"
            title="Refresh document list"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setShowUploadArea(true)}
          className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span>{t('addDocuments')}</span>
        </button>
      </div>

      <AnimatePresence>
        {showUploadArea && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-50 mb-6"
          >
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-600 rounded-xl bg-slate-900/20 relative">
              <FiUpload className="w-16 h-16 text-slate-500 mb-4" />
              <p className="text-black mb-4">{t('selectFiles')}</p>
              <input
                type="file"
                onChange={handleFileChange}
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUploadArea(false);
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-white p-2 bg-slate-900/50 rounded-full"
              >
                <FiX />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {files.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">{t('noDocuments')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {files.map((file, i) => (
              <motion.div
                key={`${file.fileName}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-slate-900/20 rounded-lg p-4 flex items-center justify-between group hover:bg-slate-900/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FiFile className="text-slate-400" />
                  <div>
                    <span className="text-black">{file.fileName}</span>
                    <div className="flex space-x-4 text-gray-500 text-sm">
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="text-gray-500 hover:text-red-400 transition-colors p-2"
                >
                  <FiX />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Documents;