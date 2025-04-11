/* eslint-disable react/no-unescaped-entities */
"use client";

import logo from './../assets/fynopsis_noBG.png'
import React, { useState, useEffect, useRef } from "react"
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Clipboard, LucideIcon, Activity, Table, Database, ChartPie, HelpCircle } from "lucide-react";

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
import { useFileStore, FileItem, Folder } from '@/components/services/HotkeyService';
import { useTabStore } from '@/components/tabStore';
// import TableViewer from '@/components/tabs/library/table/TableViewer';
import DeepResearchViewer from '@/components/tabs/deep_research/DeepResearchViewer';
import DiligenceDashboardViewer from '@/components/tabs/diligence_dashboard/DiligenceViewer2';
import { Issues } from '@/components/tabs/issues/QuestionAndAnswer';
import { IssueDetail } from '@/components/tabs/issues/issueDetail';
import websocketManager, { FileUpdateMessage } from '@/lib/websocketManager';
import { useToast } from "@/components/ui/use-toast";
import QATable from '@/components/tabs/question_answers/QATable';
import { usePermissionsStore } from '@/stores/permissionsStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type IndicatorStyle = {
  top: string;
  height: string;
};

type Tab = {
  icon: LucideIcon;
  label: string;
};

export default function Home() {
  console.log("--- DataroomPage Component Render/Mount ---"); // Log component render
  const router = useRouter();
  const searchParams = useSearchParams();

  // Replace context with store
  const { permissionDetails, isLoadingPermissions, hasPermission, dataroomId: contextDataroomId } = usePermissionsStore();

  // Define tabs first so we can use it in initialTabIndex calculation
  const tabs: Tab[] = [
    { icon: Library, label: 'Library' },

    // { icon: Table, label: 'Extract' },
    // { icon: Database, label: 'Deep Research' },
    { icon: ChartPie, label: 'Diligence' },
    { icon: MessagesSquare, label: 'Issues' }, // New tab for Issues
    { icon: HelpCircle, label: 'Q&A' }, // New tab for Q&A
    { icon: Users, label: 'Users' },
    { icon: Activity, label: 'Activity' },
  ];

  // Get the active tab from URL query parameters or default to "library"
  const defaultTab = searchParams.get('tab')?.toLowerCase() || "library";
  const [selectedTab, setSelectedTab] = useState(defaultTab);
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [userAttributes, setUserAttributes] = useState<FetchUserAttributesOutput | null>(null);
  // REMOVE state related to permissions - provided by context
  // const [permissionDetails, setPermissionDetails] = useState<any>(null);
  // const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  // Initialize activeTab based on the default tab from URL
  const initialTabIndex = tabs.findIndex(tab => tab.label.toLowerCase() === defaultTab);
  const { activeTab, setActiveTab, activeIssueId, setActiveIssueId, issuesActiveTab, setIssuesActiveTab, clearMessages,
    setSearchableFiles, setSearchableFolders, setCutFiles, setShowDetailsView, setSelectedFile,
    setPendingSelectFileId, documentBounds, setDocumentBounds, setTabSystemPanelSize,
    setDetailSectionPanelSize, setLastQuery, setCurrentThreadId, resetAccordionValues } = useFileStore();

  // Get tabStore functions
  const { setTabs, setActiveTabId, tabs: tabStoreTabs } = useTabStore();

  // Filtered tabs based on permissions (use permissionDetails from context)
  const [filteredTabs, setFilteredTabs] = useState(tabs);

  // Function to filter tabs based on user permissions
  const getFilteredTabs = (permissions: any) => {
    // Library tab is always accessible
    if (!permissions) return [tabs[0]];

    return tabs.filter(tab => {
      const tabName = tab.label.toLowerCase();

      switch (tabName) {
        case 'library':
          return true;
        case 'diligence':
          return permissions.canAccessDiligenceDashboard !== false;
        case 'issues':
          return permissions.canAccessIssuesPanel !== false;
        case 'q&a':
          return permissions.canAccessQuestionairePanel !== false;
        case 'users':
          return permissions.canAccessUserManagementPanel === true;
        case 'activity':
          return permissions.canAccessAuditLogsPanel === true &&
            permissions.canViewAuditLogs !== false;
        default:
          return false;
      }
    });
  };

  // Update filtered tabs when permissions change (listen to context value)
  useEffect(() => {
    if (permissionDetails) {
      const newFilteredTabs = getFilteredTabs(permissionDetails);
      setFilteredTabs(newFilteredTabs);

      // If current tab is not in filtered tabs, switch to library tab
      const currentTabName = selectedTab.toLowerCase();
      const hasAccess = newFilteredTabs.some(tab => tab.label.toLowerCase() === currentTabName);

      if (!hasAccess) {
        const libraryTabIndex = newFilteredTabs.findIndex(tab => tab.label.toLowerCase() === 'library');
        if (libraryTabIndex !== -1) {
          setActiveTab(libraryTabIndex);
          setSelectedTab('library');

          // Update URL query parameter without full page navigation
          const params = new URLSearchParams(searchParams.toString());
          params.set('tab', 'library');
          const pathname = window.location.pathname;
          const newUrl = `${pathname}?${params.toString()}`;
          window.history.pushState({}, '', newUrl);
        }
      }
    }
    // Depend on permissionDetails from context
  }, [permissionDetails, selectedTab, setActiveTab]);

  // Function to reset all relevant state when switching datarooms
  // This might need adjustment if called from elsewhere, but keep for now
  const resetDataroomState = () => {
    console.log("DataroomPage: Resetting page-specific state");
    clearMessages();
    setSearchableFiles([]);
    setSearchableFolders([]);
    setCutFiles([]);
    setShowDetailsView(false);
    setSelectedFile(null);
    setPendingSelectFileId(null);
    // Clear document bounds
    Object.keys(documentBounds).forEach(id => {
      setDocumentBounds(id, { page: 0, x0: 0, y0: 0, x1: 0, y1: 0 });
    });
    // Reset tab-related state
    setActiveTab(0); // Reset to Library tab index
    setActiveIssueId(null);
    setIssuesActiveTab('open');
    setTabSystemPanelSize(75);
    setDetailSectionPanelSize(25);
    setLastQuery('');
    setCurrentThreadId('');
    resetAccordionValues();

    // Clear tabStore but preserve the "All Files" tab
    if (tabStoreTabs.length > 0) {
      const allFilesTab = tabStoreTabs.find(tab => tab.title === "All Files");
      if (allFilesTab) {
        console.log("DataroomPage: Preserving All Files tab");
        setTabs([allFilesTab]);
        setActiveTabId(allFilesTab.id);
      } else {
        setTabs([]);
        setActiveTabId('');
      }
    }
  };

  // Use params hook to get current route parameters, especially subId
  const params = useParams();
  // REMOVE state related to permissions/dataroom ID tracking
  // const [hasPermission, setHasPermission] = useState<boolean>(true);
  // Define dataroomId earlier in the code
  const dataroomId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  // Get the subId (folder ID) from the params
  const subId = Array.isArray(params?.subId) ? params.subId[0] : params?.subId ?? 'home';
  // const [currentDataroomId, setCurrentDataroomId] = useState<string>('');
  // const [currentSubId, setCurrentSubId] = useState<string>(''); 

  // Still need searchable files state, but fetching might move or be triggered differently
  const { setSearchableFiles: setSearchableFilesInStore, setSearchableFolders: setSearchableFoldersInStore } = useFileStore();

  // REMOVE useEffect hooks related to fetching permissions and tracking dataroomId changes
  // useEffect(() => {
  // ... removed logic ...
  // }, [dataroomId, subId, currentDataroomId, currentSubId, resetDataroomState]); 

  // Fetch searchable files - this might need rethinking. Does it need to refetch on subId change?
  // For now, let's fetch it once when the component mounts within a valid dataroom context.
  useEffect(() => {
    if (contextDataroomId) { // Use dataroomId from context
      console.log(`DataroomPage: Fetching searchable files for ${contextDataroomId}`);
      fetchSearchableFiles(contextDataroomId);
    } else {
      console.warn("DataroomPage: No dataroomId from context, cannot fetch searchable files.");
    }
    // Depend on dataroomId from context
  }, [contextDataroomId]);

  // Keep indicatorStyle and refs for the sidebar tabs
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>({} as IndicatorStyle);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep UI state like dialogs, user info, etc.
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('READ');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const pathname = usePathname();
  // bucketUuid might be redundant if we use contextDataroomId consistently
  const pathArray = pathname?.split('/') ?? [];
  const bucketUuid = contextDataroomId || pathArray[2] || ''; // Prefer context ID
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

  // Keep tab click logic
  function handleTabClick(index: number): void {
    // ... (keep existing logic, ensure it uses filteredTabs)
    if (activeTab !== index && index < filteredTabs.length) { // Add bounds check
      const tabName = filteredTabs[index].label.toLowerCase();
      // ... rest of the logic
      setActiveTab(index);
      setSelectedTab(tabName);
      // ... update URL logic
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tabName);
      if (tabName !== 'issues') {
        params.delete('issueId');
      }
      const pathname = window.location.pathname;
      const newUrl = `${pathname}?${params.toString()}`;
      window.history.pushState({}, '', newUrl);
    }
  }

  // Keep useEffect for initial active tab setting
  useEffect(() => {
    if (initialTabIndex !== -1 && activeTab !== initialTabIndex) {
      setActiveTab(initialTabIndex);
    }
  }, [initialTabIndex, activeTab, setActiveTab]);

  // Keep useEffect for handling URL changes (pathname, issueId)
  useEffect(() => {
    // ... (keep existing logic, ensure it uses filteredTabs)
    if (!pathname || pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;
    const issueIdParam = searchParams.get('issueId');
    const pathArray = pathname.split('/');
    let tabFromUrl = 'library';
    if (pathArray.length >= 4) {
      tabFromUrl = pathArray[3].toLowerCase();
      if (tabFromUrl === 'issues' && issueIdParam && activeIssueId !== issueIdParam) {
        prevIssueIdRef.current = activeIssueId;
        setActiveIssueId(issueIdParam);
      }
    }
    const tabIndex = filteredTabs.findIndex(tab => tab.label.toLowerCase() === tabFromUrl);
    if (tabIndex !== -1 && tabIndex !== activeTab) {
      setActiveTab(tabIndex);
    }
    if (tabFromUrl !== selectedTab && (tabIndex !== -1 || tabFromUrl === 'library')) {
      setSelectedTab(tabFromUrl);
    }
  }, [pathname, filteredTabs, activeIssueId, searchParams, activeTab, setActiveTab, setSelectedTab, selectedTab]); // Added dependencies

  // Keep handleBackFromIssue logic
  const handleBackFromIssue = () => {
    // ... (keep existing logic)
    const url = new URL(window.location.href);
    url.searchParams.delete('issueId');
    window.history.pushState({}, '', url.toString());
    setTimeout(() => {
      prevIssueIdRef.current = null;
      setActiveIssueId(null);
      setForceRender(prev => prev + 1);
    }, 0);
  };

  // Keep useEffect for indicator style
  useEffect(() => {
    // ... (keep existing logic, ensure it uses filteredTabs)
    if (!tabRefs.current || tabRefs.current.length === 0) return;
    const currentTab = activeTab !== null ? activeTab : initialTabIndex;
    if (currentTab >= 0 && currentTab < filteredTabs.length && tabRefs.current[currentTab]) {
      const tabElement = tabRefs.current[currentTab];
      if (tabElement) {
        setIndicatorStyle({
          top: `${tabElement.offsetTop}px`,
          height: `${tabElement.offsetHeight}px`,
        });
      }
    }
  }, [activeTab, filteredTabs.length, initialTabIndex]);

  // Keep useEffect for fetching user attributes
  useEffect(() => {
    if (user) {
      handleFetchUserAttributes();
    }
  }, [user]);

  // Keep dark mode state and logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('color-theme') === 'dark';
    }
    return true;
  });

  // Modify fetchSearchableFiles to accept dataroomId
  const fetchSearchableFiles = async (idToFetch: string) => { // Accept ID as parameter
    console.log(`DataroomPage: Inside fetchSearchableFiles for ${idToFetch}`);
    try {
      const restOperation = get({
        apiName: 'S3_API',
        // Use the passed ID
        path: `/s3/${idToFetch}/get-file-keys`,
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);
      console.log("Searchable files response: ", response);

      const formattedFiles: FileItem[] = [];
      const formattedFolders: Folder[] = [];

      response.items?.forEach((item: any) => {
        if (item.isFolder) {
          formattedFolders.push({
            fullPath: item.fullPath || '',
            id: item.id || '',
            isFolder: true,
            lastModified: item.lastModified || '',
            name: item.name || '',
            parentFolderId: item.parentFolderId || '',
            parentFolderName: item.parentFolderName || '',
            uploadedBy: item.uploadedBy || '',
            uploadedByEmail: item.uploadedByEmail || ''
          });
        } else {
          formattedFiles.push({
            fileId: item.id || '',
            fileName: item.name || '',
            fullPath: item.fullPath || '',
            parentFolderId: item.parentFolderId || '',
            parentFolderName: item.parentFolderName || '',
            size: item.size || '',
            batchStatus: item.batchStatus || '',
            contentType: item.contentType || '',
            documentSummary: item.documentSummary || '',
            documentTitle: item.documentTitle || '',
            id: item.id || '',
            lastModified: item.lastModified || '',
            name: item.name || '',
            tags: item.tags || '',
            tagsList: item.tagsList || '',
            uploadedBy: item.uploadedBy || '',
            uploadedByEmail: item.uploadedByEmail || '',
            isFolder: false
          });
        }
      });

      setSearchableFilesInStore(formattedFiles);
      setSearchableFoldersInStore(formattedFolders);

    } catch (error) {
      console.error('Error fetching searchable files:', error);
      setSearchableFilesInStore([]);
      setSearchableFoldersInStore([]);
    }
  }

  // REMOVE fetchPermissionLevel function - now in layout
  // const fetchPermissionLevel = async () => { ... };

  // Keep toggleDarkMode logic
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

  // Keep handleShareDataroom logic (use contextDataroomId)
  const handleShareDataroom = async () => {
    if (userEmail.trim() && contextDataroomId) { // Use contextDataroomId
      setIsSharing(true);
      setShareError(null);
      try {
        const restOperation = post({
          apiName: 'S3_API',
          // Use contextDataroomId
          path: `/share-folder/${contextDataroomId}/invite-user`,
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
        // ... rest of logic
      } catch (error) {
        console.error('Error sharing dataroom:', error);
        setShareError(error instanceof Error ? error.message : 'Failed to share dataroom');
      } finally {
        setIsSharing(false);
      }
    }
  };

  // Keep handleFetchUserAttributes logic
  async function handleFetchUserAttributes() {
    try {
      const attributes = await fetchUserAttributes();
      setUserAttributes(attributes);
      setFamilyName(attributes.family_name || '');
      setGivenName(attributes.given_name || '');
    } catch (error) {
    }
  }

  // Keep renderSelectedScreen logic (use permissionDetails from context)
  const renderSelectedScreen = () => {
    if (activeIssueId && selectedTab.toLowerCase() === 'issues') {
      if (permissionDetails && permissionDetails.canAccessIssuesPanel === false) {
        return (
          <div className="grid h-screen place-items-center">
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-xl font-semibold">You don't have permission to access this panel</h2>
            </div>
          </div>
        );
      }
      return (
        <IssueDetail
          issueId={activeIssueId}
          onBack={handleBackFromIssue}
          key={`issue-${activeIssueId}-${forceRender}`}
        />
      );
    }
    switch (selectedTab.toLowerCase()) {
      case "library":
        return <Files setSelectedTab={setSelectedTab} permissionDetails={permissionDetails} />;
      case "form":
        return <ExcelViewer />;
      case "users":
        if (permissionDetails && permissionDetails.canAccessUserManagementPanel === false) {
          return (
            <div className="grid h-screen place-items-center">
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-semibold">You don't have permission to access user management</h2>
              </div>
            </div>
          );
        }
        // if (permissionDetails) {
        //   return (
        //     <div className="grid h-screen place-items-center">
        //       <div className="flex flex-col items-center gap-4">
        //         <h2 className="text-xl font-semibold">You don't have permission to view users</h2>
        //       </div>
        //     </div>
        //   );
        // }
        return <UserManagement dataroomId={contextDataroomId || ''} />;
      case "activity":
        if (permissionDetails && permissionDetails.canAccessAuditLogsPanel === false) {
          return (
            <div className="grid h-screen place-items-center">
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-semibold">You don't have permission to access activity logs</h2>
              </div>
            </div>
          );
        }
        if (permissionDetails && permissionDetails.canViewAuditLogs === false) {
          return (
            <div className="grid h-screen place-items-center">
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-semibold">You don't have permission to view activity logs</h2>
              </div>
            </div>
          );
        }
        return <AuditLogViewer bucketId={contextDataroomId || ''} permissionDetails={permissionDetails} />;
      case "diligence":
        if (permissionDetails && permissionDetails.canAccessDiligenceDashboard === false) {
          return (
            <div className="grid h-screen place-items-center">
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-semibold">You don't have permission to access the diligence dashboard</h2>
              </div>
            </div>
          );
        }
        return <DiligenceDashboardViewer />;
      case "issues":
        if (permissionDetails && permissionDetails.canAccessIssuesPanel === false) {
          return (
            <div className="grid h-screen place-items-center">
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-semibold">You don't have permission to access issues</h2>
              </div>
            </div>
          );
        }
        return <Issues key={`issues-list-${forceRender}-${issuesActiveTab}`} />;
      case "q&a":
        if (permissionDetails && permissionDetails.canAccessQuestionairePanel === false) {
          return (
            <div className="grid h-screen place-items-center">
              <div className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-semibold">You don't have permission to access Q&A</h2>
              </div>
            </div>
          );
        }
        return <QATable />;
      default:
        return <Files setSelectedTab={setSelectedTab} permissionDetails={permissionDetails} />;
    }
  };

  // Keep useEffect for dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Return the main JSX structure
  return (
    <div className="relative h-screen w-full flex flex-row sans-serif">
      {/* Sidebar */}
      <div className="w-20 bg-slate-900 h-full flex flex-col items-center justify-between pt-4 pb-6">
        {/* Add the logo back here */}
        <div className="flex items-center flex-col">
          <img
            src={logo.src}
            alt="logo"
            className="h-14 w-auto mb-8 cursor-pointer"
            onClick={() => router.push('/dashboard')}
          />
          {/* Tab Icons */}
          <div className="relative flex flex-col items-center">
            {activeTab !== null && activeTab < filteredTabs.length && ( // Add bounds check
              <div
                className={`absolute left-0 w-full bg-blue-300 rounded-xl ${shouldAnimate ? 'transition-all duration-300 ease-in-out' : 'transition-none'} z-20`}
                style={{
                  top: `${tabRefs.current[activeTab]?.offsetTop || 0}px`,
                  height: `${tabRefs.current[activeTab]?.offsetHeight || 0}px`
                }}
              />
            )}
            {filteredTabs.map((tab, index) => (
              <div
                key={tab.label}
                ref={(el) => { tabRefs.current[index] = el }}
                className={`relative z-30 p-2 mb-4 cursor-pointer ${activeTab === index ? 'text-slate-900' : 'text-white'}`}
                onClick={() => handleTabClick(index)}
              >
                <tab.icon size={24} />
              </div>
            ))}
          </div>
        </div>
        {/* Share Button - use context permissionDetails */}
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
              <div>
                {!permissionDetails?.canInviteUsers?.includes('*') ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            disabled
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Share
                          </Button>
                        </div>

                      </TooltipTrigger>
                      <TooltipContent>
                        Adding users is disabled
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
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
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="flex items-center flex-col gap-3">
          {permissionDetails &&
            (Array.isArray(permissionDetails.canInviteUsers) &&
              permissionDetails.canInviteUsers.length > 0) && (
              <Button onClick={() => setIsShareDialogOpen(true)} className="flex justify-center items-center">
                <Share size={24} />
              </Button>
            )}
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
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex h-full dark:bg-darkbg">
        {/* Render screen based on context and current tab */}
        {renderSelectedScreen()}
      </div>
    </div>
  );
}