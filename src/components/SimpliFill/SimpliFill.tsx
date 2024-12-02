"use client";
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiX, FiFile, FiUser, FiFolder, FiFileText, FiBell } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Amplify } from 'aws-amplify';
import { post } from "aws-amplify/api";
import logo from './../../app/assets/SimpliFill.png';
import useTranslation from "./useTranslation";
import Profile from './Profile';
import Documents from './Documents';
import Forms from './Forms';

// Keeping your existing Amplify configuration
Amplify.configure({
  API: {
    REST: {
      LLAMA_API: {
        endpoint: 'https://qu3mo7nsml.execute-api.us-east-1.amazonaws.com/prod',
        region: 'us-east-1'
      }
    }
  },
});

const formTypes = ['W-4', "Driver's License", 'SNAP'];

const languages = [
  { name: 'English', code: 'en' },
  { name: 'Français', code: 'fr' },
  { name: 'Español', code: 'es' },
  { name: 'Русский', code: 'ru' },
  { name: '中文', code: 'zh' },
  { name: 'اردو', code: 'ur' },
  { name: 'العربية', code: 'ar' },
  { name: '한국어', code: 'ko' },
  { name: '日本語', code: 'ja' },
  { name: 'Deutsch', code: 'de' }
];


const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-6 py-4 transition-colors ${active
      ? 'text-white border-r-2 border-slate-500 bg-slate-500/10'
      : 'text-white/70 hover:text-white hover:bg-slate-500/5'
      }`}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

// Keeping your existing handleFileUpload function
const handleFileUpload = async (file: File) => {
  try {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
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
};

export default function SimpliFill() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedForm, setSelectedForm] = useState(0);
  const [showMainContent, setShowMainContent] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('forms');

  const { t } = useTranslation(language);


  const navigationItems = [
    { id: 'profile', label: t('yourProfile'), icon: FiUser },
    { id: 'documents', label: t('documents'), icon: FiFolder },
    { id: 'forms', label: t('forms'), icon: FiFileText }
  ];



  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      try {
        const uploadPromises = acceptedFiles.map(file => handleFileUpload(file));
        await Promise.all(uploadPromises);
        setFiles(prev => [...prev, ...acceptedFiles]);
      } catch (error) {
        console.error('Error uploading files:', error);
      }
    },
    multiple: true
  });

  const removeFile = async (index: number) => {
    try {
      setFiles(files.filter((_, i) => i !== index));
      try {
        await post({
          apiName: 'LLAMA_API',
          path: '/data/remove',
          options: {
            headers: { 'Content-Type': 'application/json' },
            body: { fileName: files[index].name }
          }
        });
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  const handleLanguageSelect = (language: any) => {
    setSelectedLanguage(language.name);
    setLanguage(language.code);
    setIsLanguageDropdownOpen(false);
  };

  const handleContinue = () => {
    setShowMainContent(true);
  };

  const TabContent = () => {
    switch (activeTab) {
      case 'forms':
        return <Forms
          language={language}
          files={files}
          setFiles={setFiles}
          handleFileUpload={handleFileUpload}
          removeFile={removeFile}
          formTypes={formTypes}
          selectedForm={selectedForm}
          setSelectedForm={setSelectedForm}
        />;
      case 'profile':
        return <Profile language={language} />;
      case 'documents':
        return <Documents language={language} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-h-screen min-h-screen bg-white   flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-16 border-b border-slate-900 ">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-4">
            <div className="relative w-48 z-10">
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="w-full  text-slate-900/30 px-3 py-3 rounded-lg flex items-center justify-between hover:bg-slate-900/40 transition-colors  border-slate-500/30 backdrop-blur-sm"
              >
                <span>{selectedLanguage}</span>
                <ChevronDown className={`transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLanguageDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute mt-2 w-full bg-slate-900/30 border border-slate-500/30 rounded-lg backdrop-blur-sm z-50 overflow-visible"
                  style={{
                    top: '100%',
                    left: 0,
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}
                >
                  <ScrollArea className="h-48 w-full">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang)}
                        className="w-full px-4 py-2 text-left text-white hover:bg-slate-500/30 transition-colors"
                      >
                        {lang.name}
                      </button>
                    ))}
                  </ScrollArea>
                </motion.div>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <button className="p-2 text-slate-400 hover:text-slate-300 transition-colors">
              <FiBell className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <div className="w-48 bg-white border-r border-slate-900">
          <nav className="flex flex-col">
            {navigationItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-3 text-left text-black hover:bg-slate-500/20 transition-colors flex items-center gap-3
                ${activeTab === id ? 'bg-slate-500/20 rounded-2xl px-2' : ''}`}
              >
                <Icon className="w-5 h-5 text-slate-900" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <TabContent />
        </div>
      </div>
    </div>
  );
}