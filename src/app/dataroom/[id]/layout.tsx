"use client";

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { get } from 'aws-amplify/api';
import { CircularProgress } from "@mui/material";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { usePermissionsStore } from '@/stores/permissionsStore';

export default function DataroomLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const {
    setPermissions,
    setLoading,
    setHasPermission,
    setDataroomId,
    isLoadingPermissions,
    hasPermission,
    permissionDetails,
    dataroomId: currentDataroomId,
    setCanAccessAuditLogsPanel,
    setCanAccessIssuesPanel,
    setCanAccessQuestionairePanel,
    setCanAccessUserManagementPanel,
    setCanAddQuestionaire,
    setCanAnswerIssue,
    setCanCreateDiligenceWidget,
    setCanCreateIssue,
    setCanCreatePermissionGroups,
    setCanAccessDiligenceDashboard,
    setCanDeleteWidgets,
    setCanExportAuditLogs,
    setCanInviteUsers,
    setCanMoveWidgets,
    setCanQueryEntireDataroom,
    setCanUpdatePeerPermissions,
    setCanViewPermissionGroupDetails,
    setCanViewUsers,
    setDefaultFilePermsViewAccess,
    setDefaultFilePermsWatermarkContent,
    setDefaultFilePermsDeleteAccess,
    setDefaultFilePermsEditAccess,
    setDefaultFilePermsViewComments,
    setDefaultFolderPermsAllowUploads,
    setDefaultFolderPermsCreateFolders,
    setDefaultFolderPermsAddComments,
    setDefaultFolderPermsViewComments,
    setDefaultFolderPermsViewContents,
    setCanOrganize,
  } = usePermissionsStore();

  // Extract dataroomId from params
  const dataroomId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? null;

  // Function to fetch permissions
  const fetchPermissionLevel = async (id: string) => {
    // Only start loading if we don't have details or the ID changed
    // if (!permissionDetails || id !== currentDataroomId) {
    //   setLoading(true);
    //   setPermissions(null);
    // } else {
    //   setLoading(false);
    //   return;
    // }

    try {
      const restOperation = get({
        apiName: 'S3_API',
        path: `/share-folder/${id}/get-permissions`,
        options: {
          headers: { 'Content-Type': 'application/json' },
        },
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);

      setPermissions(response.permissionDetails);
      // setCanAccessAuditLogsPanel(true);
      // setCanAccessIssuesPanel(true);
      // setCanAccessQuestionairePanel(true);
      // setCanAccessUserManagementPanel(true);
      // setCanAddQuestionaire(true);
      // setCanAnswerIssue(true);
      // setCanCreateDiligenceWidget(true);
      // setCanCreateIssue(true);
      // setCanCreatePermissionGroups(false);
      // setCanAccessDiligenceDashboard(true);
      // setCanDeleteWidgets(false);
      // setCanExportAuditLogs(false);
      // setCanInviteUsers(["hello"]);
      // setCanMoveWidgets(false);
      // setCanQueryEntireDataroom(false);
      // setCanUpdatePeerPermissions(true);
      // setCanViewPermissionGroupDetails(true);
      // setDefaultFilePermsViewAccess(true);
      // setDefaultFilePermsEditAccess(true);
      // setDefaultFilePermsDeleteAccess(true);
      // setDefaultFilePermsViewComments(false);
      // setDefaultFolderPermsAllowUploads(false);
      // setDefaultFolderPermsCreateFolders(false);
      // setDefaultFolderPermsAddComments(false);
      // setDefaultFolderPermsViewComments(false);
      // setDefaultFolderPermsViewContents(false);
      // setCanOrganize(false);
      // setCanViewUsers(true);
      setHasPermission(true);
      setDataroomId(id);

    } catch (error) {
      console.error("Layout: Error fetching permissions:", error);
      setPermissions(null as any);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch permissions when dataroomId changes
  useEffect(() => {
    if (dataroomId && dataroomId !== currentDataroomId) {
      fetchPermissionLevel(dataroomId);
    } else if (dataroomId ) {
      fetchPermissionLevel(dataroomId);
    } else if (!dataroomId) {
      setLoading(false);
      setHasPermission(false);
    }
  }, [dataroomId, currentDataroomId]);

  const handleReturnToDashboard = () => {
    router.push('/dashboard');
  };

  if (isLoadingPermissions) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="flex flex-col items-center gap-4">
          <CircularProgress />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

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

  return <>{children}</>;
}


