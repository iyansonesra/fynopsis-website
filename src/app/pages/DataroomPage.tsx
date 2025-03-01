/* eslint-disable react/no-unescaped-entities */
"use client";

import logo from './../assets/fynopsis_noBG.png'
import { useState, useEffect } from "react"
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Clipboard, LucideIcon, Activity, Table } from "lucide-react";
import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { CircularProgress } from "@mui/material";
import React, { useRef } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Library, Users, LogOut } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Files from "@/components/Files";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { get, post } from 'aws-amplify/api';
import { Share } from "lucide-react";
import UserManagement from "@/components/Collaborators";
import ExcelViewer from '@/components/ExcelViewer';
import DarkModeToggle from '@/components/DarkModeToggle';
import { FileSystem } from '@/components/ElevatedTable';
import { Separator } from '@radix-ui/react-separator';
import { TagDisplay } from '@/components/TagsHover';
import { AuditLogViewer } from '@/components/AuditLogViewer';
import Link from 'next/link';
import { useFileStore } from '@/components/HotkeyService';
import TableViewer from '@/components/TableViewer';


type IndicatorStyle = {
  top: string;
  height: string;
};

type Tab = {
  icon: LucideIcon;
  label: string;
};

export default function Home() {
  const [selectedTab, setSelectedTab] = useState("library");
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<number | null>(0);
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({} as IndicatorStyle);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('READ');
  const pathname = usePathname();
  const pathArray = pathname?.split('/') ?? [];
  const bucketUuid = pathArray[2] || '';
  const params = useParams();
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const dataroomId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const { setSearchableFiles } = useFileStore();
  const [familyName, setFamilyName] = useState('');
  const [givenName, setGivenName] = useState('');




  const tabs: Tab[] = [
    { icon: Library, label: 'Library' },
    { icon: Users, label: 'Users' },
    { icon: Activity, label: 'Activity' },
    { icon: Table, label: 'Extract' },
  ];

  function signIn(): void {
    router.push('/signin');
  }


  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDataroomName, setNewDataroomName] = useState('');





  function handleTabClick(index: number): void {
    setActiveTab(index);
    setSelectedTab(tabs[index].label.toLowerCase());
  }

  useEffect(() => {
    // console.log("checking for tab color!");
    if (activeTab !== null && tabRefs.current[activeTab]) {
      const tabElement = tabRefs.current[activeTab];
      if (tabElement) {
        setIndicatorStyle({
          top: `${tabElement.offsetTop}px`,
          height: `${tabElement.offsetHeight}px`,
        });
      }
    }
  }, [activeTab]);






  useEffect(() => {
    if (user) {
      handleFetchUserAttributes();
    }
  }, [user]);



  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('color-theme') === 'dark';
    }
    return true;
  });

  useEffect(() => {
    fetchPermissionLevel();
    fetchSearchableFiles();

  }, []);

  const fetchSearchableFiles = async () => {

    interface Files {
      fileId: string;
      fileName: string;
      fullPath: string;
      parentFolderId: string;
      parentFolderName: string;
      size: string;
    }


    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/s3/${bucketUuid}/get-file-keys`,
      });
      // await restOperation.response; // Wait for response to confirm permissions

      const { body } = await restOperation.response;
      // console.log('Body:', body);
      const responseText = await body.text();
      const response = JSON.parse(responseText);
     console.log('Files response:', response);
      interface FileResponse {
        fileId?: string;
        fileName?: string;
        fullPath?: string;
        parentFolderId?: string;
        parentFolderName?: string;
        size?: string;
      }

      const formattedFiles: Files[] = response.files ? response.files.map((file: FileResponse): Files => ({
        fileId: file.fileId || '',
        fileName: file.fileName || '',
        fullPath: file.fullPath || '',
        parentFolderId: file.parentFolderId || '',
        parentFolderName: file.parentFolderName || '',
        size: file.size || ''
      })) : [];

      console.log("formattedFiles", formattedFiles);
      setSearchableFiles(formattedFiles);

    } catch (error) {
      console.error('Error fetching searchable files:', error);
      setSearchableFiles([]);
    }
  }

  const fetchPermissionLevel = async () => {
    console.log("bucketuid", bucketUuid);

    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/share-folder/${bucketUuid}/get-permissions`,
        options: {
          headers: { 'Content-Type': 'application/json' },
        },
      });
      // await restOperation.response; // Wait for response to confirm permissions

      const { body } = await restOperation.response;
      // console.log('Body:', body);
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      console.log('Users response:', response);

      setHasPermission(true);
    } catch (error) {
      setHasPermission(false);
    }
  };

  const handleMickey = () => {
    console.log('Mickey clicked');
    // router?.replace('/ooga', undefined, { shallow: true });
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('color-theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('color-theme', 'dark');
    }
  };

  const handleShareDataroom = async () => {
    if (userEmail.trim()) {
      try {
        const restOperation = post({
          apiName: 'S3_API',
          path: `/share-folder/${dataroomId}/invite-user`,
          options: {
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              userEmail: userEmail.trim(),
              permissionLevel: permissionLevel
            },
            withCredentials: true
          },
        });

        const { body } = await restOperation.response;
        const responseText = await body.text();
        const response = JSON.parse(responseText);
        // console.log('Share response:', response);

        setIsShareDialogOpen(false);
        setUserEmail('');
        // Show success toast/message
      } catch (error) {
        console.error('Error sharing dataroom:', error);
        // Show error toast/message
      }
    }
  };



  useEffect(() => {
    if (user) {
      handleFetchUserAttributes();
    }
  }, [user]);

  async function handleFetchUserAttributes() {
    try {
      const attributes = await fetchUserAttributes();
      console.log('User attributes:', attributes);
      setUserAttributes(attributes);
      setFamilyName(attributes.family_name || '');
      setGivenName(attributes.given_name || '');
    } catch (error) {
      console.log("error");
    }
  }
  const renderSelectedScreen = () => {
    switch (selectedTab.toLowerCase()) {
      case "library":
        return <Files setSelectedTab={setSelectedTab} />;
      case "form":
        return <ExcelViewer />;
      case "users":
        return <UserManagement dataroomId={''} />;
      case "activity":
        return <AuditLogViewer bucketId={dataroomId} />;
      case "extract":
        return <TableViewer />;
      default:
        return <Files setSelectedTab={setSelectedTab} />;
    }
  };


  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleReturnToDashboard = () => {
    router.push('/dashboard');
  };

  if (!hasPermission) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold">This dataroom does not exist or you do not have proper permissions</h2>
          <Button onClick={handleReturnToDashboard}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }



  return (
 
      <div className="relative h-screen w-full flex flex-row sans-serif">
        <div className="w-20 bg-slate-900 h-full flex flex-col items-center justify-between pt-4 pb-6">
          <div className="flex items-center flex-col">
            <img
              src={logo.src}
              alt="logo"
              className="h-14 w-auto mb-8 cursor-pointer"
              onClick={() => router.push('/dashboard')}
            />
            <div className="relative flex flex-col items-center">

              {activeTab !== null && (
                <div
                  className="absolute left-0 w-full bg-blue-300 rounded-xl transition-all duration-300 ease-in-out z-20"
                  style={{
                    top: `${tabRefs.current[activeTab]?.offsetTop || 0}px`,
                    height: `${tabRefs.current[activeTab]?.offsetHeight || 0}px`
                  }}
                />
              )}
              {tabs.map((tab, index) => (
                <div
                  key={tab.label}
                  ref={(el) => { tabRefs.current[index] = el }}
                  className={`relative z-30 p-2 mb-4 cursor-pointer ${activeTab === index ? 'text-slate-900' : 'text-white'
                    }`}
                  onClick={() => handleTabClick(index)}
                >
                  <tab.icon size={24} />
                </div>
              ))}
            </div>


            {/* <TagDisplay tags={['lol', 'wow', 'cool']} /> */}

          </div>



          <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
            <DialogContent className="dark:bg-darkbg outline-none border-none">
              <DialogHeader>
                <DialogTitle className='dark:text-white'>Share Dataroom</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="Enter user email"
                  type="email"
                  className='outline-none select-none dark:bg-darkbg dark:text-white'
                />
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="READ">Read</option>
                  <option value="WRITE">Write</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleShareDataroom}>Share</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="flex items-center flex-col gap-3">
            <Button onClick={() => setIsShareDialogOpen(true)} className="flex justify-center items-center">
              <Share size={24} />
            </Button>
            <Popover>
                <PopoverTrigger className='bg-sky-600 h-10 aspect-square rounded-full flex items-center justify-center text-white'>
                {userAttributes?.given_name && userAttributes?.family_name 
                  ? (givenName[0]+familyName[0]).toUpperCase()
                  : 'U'}
                </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 px-4 py-2 text-red-500 hover:bg-gray-100 w-full text-sm"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
                <Separator orientation="horizontal" />
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center space-x-2 px-4 py-2 text-red-500 hover:bg-gray-100 w-full text-sm gap-2"
                >
                  {isDarkMode ? '🌙' : '☀️'}
                  {isDarkMode ? <span className="text-black">Dark</span> : <span className="text-black">Light</span>}
                </button>


              </PopoverContent>

            </Popover>
          </div>

        </div>

        <div className="flex-1 overflow-hidden flex h-full dark:bg-darkbg">
          {renderSelectedScreen()}
        </div>
      </div> 
  );
}