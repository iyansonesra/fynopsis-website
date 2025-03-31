/* eslint-disable react/no-unescaped-entities */
"use client";

import logo from './../assets/fynopsis_noBG.png'
import React, { useState, useEffect, useRef } from "react"
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Clipboard, LucideIcon, Activity, Table, Database, ChartPie } from "lucide-react";

import { fetchUserAttributes, FetchUserAttributesOutput } from 'aws-amplify/auth';
import { CircularProgress } from "@mui/material";
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Library, Users, LogOut, MessagesSquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Files from "@/components/tabs/library/table/Files";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { get, post } from 'aws-amplify/api';
import { Share } from "lucide-react";
import UserManagement from "@/components/tabs/user_management/Collaborators";
import ExcelViewer from '@/components/tabs/library/table/ExcelViewer';
import DarkModeToggle from '@/components/tabs/misc/DarkModeToggle';
import { Separator } from '@radix-ui/react-separator';
import { TagDisplay } from '@/components/tabs/library/table/TagsHover';
import { AuditLogViewer } from '@/components/tabs/audit_log/AuditLogViewer';
import Link from 'next/link';
import { useFileStore } from '@/components/services/HotkeyService';
// import TableViewer from '@/components/tabs/library/table/TableViewer';
import DeepResearchViewer from '@/components/tabs/deep_research/DeepResearchViewer';
import DiligenceDashboardViewer from '@/components/tabs/diligence_dashboard/DiligenceViewer2';
import { Issues } from '@/components/tabs/issues/QuestionAndAnswer';
import { IssueDetail } from '@/components/tabs/issues/issueDetail';
import websocketManager, { FileUpdateMessage } from '@/lib/websocketManager';
import { useToast } from "@/components/ui/use-toast";


type IndicatorStyle = {
  top: string;
  height: string;
};

type Tab = {
  icon: LucideIcon;
  label: string;
};

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Define tabs first so we can use it in initialTabIndex calculation
  const tabs: Tab[] = [
    { icon: Library, label: 'Library' },
   
    // { icon: Table, label: 'Extract' },
    // { icon: Database, label: 'Deep Research' },
    { icon: ChartPie, label: 'Diligence' },
    { icon: MessagesSquare, label: 'Issues' }, // New tab for Issues
    { icon: Users, label: 'Users' },
    { icon: Activity, label: 'Activity' },
  ];

  // Get the active tab from URL query parameters or default to "library"
  const defaultTab = searchParams.get('tab')?.toLowerCase() || "library";
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);

  // Initialize activeTab based on the default tab from URL
  const initialTabIndex = tabs.findIndex(tab => tab.label.toLowerCase() === defaultTab);
  const { activeTab, setActiveTab, activeIssueId, setActiveIssueId, issuesActiveTab } = useFileStore();

  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({} as IndicatorStyle);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('READ');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const pathname = usePathname();
  const pathArray = pathname?.split('/') ?? [];
  const bucketUuid = pathArray[2] || '';
  const params = useParams();
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const dataroomId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const { setSearchableFiles } = useFileStore();
  const [familyName, setFamilyName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const { toast } = useToast();
  
  // WebSocket connection state
  const [wsConnected, setWsConnected] = useState(false);
  
  // Add force render counter for issue navigation
  const [forceRender, setForceRender] = useState(0);

  // Add a ref to track the previous pathname and issue ID to avoid loops
  const prevPathRef = useRef<string | null>(null);
  const prevIssueIdRef = useRef<string | number | null>(null);

  // Force re-render counter for issue navigation
  function signIn(): void {
    router.push('/signin');
  }

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDataroomName, setNewDataroomName] = useState('');
  function handleTabClick(index: number): void {
    // Only update if we're changing tabs
    if (activeTab !== index) {
      const tabName = tabs[index].label.toLowerCase();
      
      // Enable animations now that user is clicking
      if (!shouldAnimate) {
        setShouldAnimate(true);
      }
      
      // If switching to a tab other than issues, clear any active issue
      if (tabName !== 'issues' && activeIssueId !== null) {
        prevIssueIdRef.current = null;
        setActiveIssueId(null);
      }
      
      setActiveTab(index);
      setSelectedTab(tabName);

      // Update URL query parameter without full page navigation
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tabName);
      
      // Also remove any issueId query param when switching tabs
      if (tabName !== 'issues') {
        params.delete('issueId');
      }

      // Use window.history to update the URL
      const pathname = window.location.pathname;
      const newUrl = `${pathname}?${params.toString()}`;
      window.history.pushState({}, '', newUrl);
    }
  }
  useEffect(() => {
    if (initialTabIndex !== -1 && activeTab !== initialTabIndex) {
      setActiveTab(initialTabIndex);
    }
  }, [initialTabIndex, activeTab, setActiveTab]);


useEffect(() => {
  // Skip if pathname not ready or if the pathname hasn't changed since last check
  if (!pathname || pathname === prevPathRef.current) return;
  
  // Update the previous pathname ref
  prevPathRef.current = pathname;

  // Check for issueId in query parameters
  const issueIdParam = searchParams.get('issueId');
  
  // Parse the URL path to determine active tab
  const pathArray = pathname.split('/');
  
  // Extract tab from URL (ignoring any issue IDs in the path)
  let tabFromUrl = 'library'; // Default
  if (pathArray.length >= 4) {
    tabFromUrl = pathArray[3].toLowerCase();
    
    // Special case: if we're on the issues tab and there's an issueId in query params
    if (tabFromUrl === 'issues' && issueIdParam && activeIssueId !== issueIdParam) {
      prevIssueIdRef.current = activeIssueId;
      setActiveIssueId(issueIdParam);
    }
  }
  
  // Find the tab index
  const tabIndex = tabs.findIndex(tab => tab.label.toLowerCase() === tabFromUrl);
  
  // Only update if we found a valid tab and it's different from current
  if (tabIndex !== -1 && tabIndex !== activeTab) {
    setActiveTab(tabIndex);
  }
  
  // Only update selected tab name if it's different
  if (tabFromUrl !== selectedTab && (tabIndex !== -1 || tabFromUrl === 'library')) {
    setSelectedTab(tabFromUrl);
  }
  
}, [pathname, tabs, activeIssueId, searchParams]); // Add searchParams to dependencies

// Update handleBackFromIssue to preserve the issuesActiveTab state
const handleBackFromIssue = () => {
  // First update the URL to remove the issueId query param
  const url = new URL(window.location.href);
  url.searchParams.delete('issueId');
  window.history.pushState({}, '', url.toString());
  
  // Create a small delay to ensure the URL change is registered first
  setTimeout(() => {
    // Reset issue tracking to prevent loops
    prevIssueIdRef.current = null;
    
    // Clear the active issue ID - this should trigger a re-render
    setActiveIssueId(null);
    
    // Force a re-render immediately
    setForceRender(prev => prev + 1);
    
    // Note: We no longer need to reset issuesActiveTab - it's preserved in the store
  }, 0);
};





useEffect(() => {
  // Skip if refs aren't ready
  if (!tabRefs.current || tabRefs.current.length === 0) return;
  
  // Determine which tab index to use (activeTab might be null on first load)
  console.log("activeTab: ", activeTab);
  console.log("checking if its null: ", activeTab !== null);
  const currentTab = activeTab !== null ? activeTab : initialTabIndex;
  
  // Only update if we have a valid index and the ref exists
  if (currentTab >= 0 && 
      currentTab < tabs.length && 
      tabRefs.current[currentTab]) {
    
    const tabElement = tabRefs.current[currentTab];
    if (tabElement) {
      setIndicatorStyle({
        top: `${tabElement.offsetTop}px`,
        height: `${tabElement.offsetHeight}px`,
      });
    }
  }
}, [activeTab, tabs.length, initialTabIndex]);

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
      const responseText = await body.text();
      const response = JSON.parse(responseText);
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

      console.log("formattedFiles: ", formattedFiles);

      setSearchableFiles(formattedFiles);

    } catch (error) {
      console.error('Error fetching searchable files:', error);
      setSearchableFiles([]);
    }
  }

  const fetchPermissionLevel = async () => {
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
      const responseText = await body.text();
      const response = JSON.parse(responseText);

      setHasPermission(true);
    } catch (error) {
      setHasPermission(false);
    }
  };

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
      setIsSharing(true);
      setShareError(null);
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
              permissionIdentifier: permissionLevel
            },
            withCredentials: true
          },
        });

        const { body, statusCode } = await restOperation.response;
        const responseText = await body.text();
        const response = JSON.parse(responseText);

        if (statusCode >= 400) {
          throw new Error(response.message || 'Failed to share dataroom');
        }

        setIsShareDialogOpen(false);
        setUserEmail('');
        // Show success toast/message
      } catch (error) {
        console.error('Error sharing dataroom:', error);
        setShareError(error instanceof Error ? error.message : 'Failed to share dataroom');
      } finally {
        setIsSharing(false);
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
      setUserAttributes(attributes);
      setFamilyName(attributes.family_name || '');
      setGivenName(attributes.given_name || '');
    } catch (error) {
    }
  }
  const renderSelectedScreen = () => {
    // First check if we should render the issue detail
    if (activeIssueId && selectedTab.toLowerCase() === 'issues') {
      return (
        <IssueDetail 
          issueId={activeIssueId} 
          onBack={handleBackFromIssue} 
          key={`issue-${activeIssueId}-${forceRender}`} 
        />
      );
    }
    
    // Otherwise render the appropriate tab content
    switch (selectedTab.toLowerCase()) {
      case "library":
        return <Files setSelectedTab={setSelectedTab} />;
      case "form":
        return <ExcelViewer />;
      case "users":
        return <UserManagement dataroomId={''} />;
      case "activity":
        return <AuditLogViewer bucketId={dataroomId} />;
      // case "extract":
      //   return <TableViewer />;
      // case "deep research":
      //   return <DeepResearchViewer />;
      case "diligence":
        return <DiligenceDashboardViewer />;
      case "issues":
        return <Issues key={`issues-list-${forceRender}-${issuesActiveTab}`} />; 
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

  // Initialize WebSocket connection when the component mounts
  // useEffect(() => {
  //   if (!dataroomId) return;
    
  //   console.log('Connecting to WebSocket for dataroom:', dataroomId);
    
  //   // Check if already connected to this dataroom
  //   if (websocketManager.isConnectedTo(dataroomId)) {
  //     console.log('Already connected to WebSocket for dataroom:', dataroomId);
  //     setWsConnected(true);
  //     return;
  //   }
    
  //   // Connect to the WebSocket
  //   websocketManager.connect(dataroomId)
  //     .then(() => {
  //       setWsConnected(true);
  //       console.log('WebSocket connected successfully');
  //     })
  //     .catch(error => {
  //       console.error('Error connecting to WebSocket:', error);
  //     });
    
  //   // Set up a handler for file update messages
  //   const handleFileUpdate = (message: FileUpdateMessage) => {
  //     // Don't show notifications for our own actions
  //     if (message.data.userEmail === userAttributes?.email) {
  //       return;
  //     }
      
  //     // Process the message
  //     let toastMessage = '';
      
  //     switch (message.type) {
  //       case 'FILE_UPLOADED':
  //         toastMessage = `File "${message.data.fileName}" uploaded by ${message.data.uploadedBy || 'a user'}`;
  //         break;
  //       case 'FILE_DELETED':
  //         toastMessage = `File "${message.data.fileName}" deleted by ${message.data.uploadedBy || 'a user'}`;
  //         break;
  //       case 'FILE_MOVED':
  //         toastMessage = `File "${message.data.fileName}" moved by ${message.data.uploadedBy || 'a user'}`;
  //         break;
  //       case 'FILE_RENAMED':
  //         toastMessage = `File renamed to "${message.data.fileName}" by ${message.data.uploadedBy || 'a user'}`;
  //         break;
  //       case 'FILE_TAG_UPDATED':
  //         toastMessage = `Tags updated for "${message.data.fileName}" by ${message.data.uploadedBy || 'a user'}`;
  //         break;
  //       case 'BATCH_STATUS_UPDATED':
  //         toastMessage = `Processing status updated for "${message.data.fileName}"`;
  //         break;
  //       case 'FOLDER_CREATED':
  //         toastMessage = `Folder "${message.data.fileName}" created by ${message.data.uploadedBy || 'a user'}`;
  //         break;
  //       case 'pong':
  //         // Don't display toast for pong messages
  //         break;
  //       default:
  //         if (message.type && message.type !== 'ping') {
  //           toastMessage = `Update: ${message.type}`;
  //         }
  //     }
      
  //     if (toastMessage) {
  //       toast({
  //         title: "File Update",
  //         description: toastMessage,
  //         duration: 4000,
  //       });
  //     }
  //   };
    
  //   // Register the handler
  //   websocketManager.addMessageHandler(handleFileUpdate);
    
  //   // Set up ping interval to keep the connection alive
  //   const pingInterval = setInterval(() => {
  //     if (websocketManager.isConnectedTo(dataroomId)) {
  //       websocketManager.sendMessage({ action: 'ping' });
  //     }
  //   }, 45000); // Every 45 seconds
    
  //   // Clean up
  //   return () => {
  //     clearInterval(pingInterval);
  //     websocketManager.removeMessageHandler(handleFileUpdate);
      
  //     // We still retain the connection when navigating away from the room
  //     if (dataroomId) {
  //       console.log('Releasing WebSocket connection reference');
  //       websocketManager.release();
  //     }
  //   };
  // }, [dataroomId, userAttributes?.email, toast]);

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
                className={`absolute left-0 w-full bg-blue-300 rounded-xl ${shouldAnimate ? 'transition-all duration-300 ease-in-out' : 'transition-none'} z-20`}
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



        <Dialog open={isShareDialogOpen} onOpenChange={(open) => {
          setIsShareDialogOpen(open);
          if (!open) {
            setShareError(null);
          }
        }}>
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
              {shareError && (
                <div className="text-red-500 text-sm mt-2">
                  {shareError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsShareDialogOpen(false)}
                disabled={isSharing}
                className="dark:bg-transparent dark:text-white dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleShareDataroom}
                disabled={!userEmail.trim() || isSharing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSharing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sharing...
                  </span>
                ) : (
                  'Share'
                )}
              </Button>
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
                ? (givenName[0] + familyName[0]).toUpperCase()
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