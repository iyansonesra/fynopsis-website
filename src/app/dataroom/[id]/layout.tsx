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
  } = usePermissionsStore();

  // Extract dataroomId from params
  const dataroomId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? null;

  // Function to fetch permissions
  const fetchPermissionLevel = async (id: string) => {
    // Only start loading if we don't have details or the ID changed
    // if (!permissionDetails || id !== currentDataroomId) {
    //   console.log(`Layout: Setting loading true for dataroom: ${id}`);
    //   setLoading(true);
    //   setPermissions(null);
    // } else {
    //   console.log(`Layout: Permissions already loaded for ${id}, skipping fetch.`);
    //   setLoading(false);
    //   return;
    // }

    try {
      console.log(`Layout: Fetching permissions for dataroom: ${id}`);
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

      console.log("Layout: Permission response:", response);
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
      setCanUpdatePeerPermissions(true);
      setHasPermission(true);
      setDataroomId(id);

    } catch (error) {
      console.error("Layout: Error fetching permissions:", error);
      setPermissions(null as any);
      setHasPermission(false);
    } finally {
      console.log(`Layout: Finished fetching permissions for ${id}, setting loading false.`);
      setLoading(false);
    }
  };

  // Effect to fetch permissions when dataroomId changes
  useEffect(() => {
    console.log(`Layout: useEffect triggered. dataroomId: ${dataroomId}, currentDataroomId: ${currentDataroomId}`);
    if (dataroomId && dataroomId !== currentDataroomId) {
      console.log(`Layout: Dataroom ID changed to ${dataroomId}. Fetching permissions.`);
      fetchPermissionLevel(dataroomId);
    } else if (dataroomId ) {
      console.log(`Layout: Initial load for dataroom ${dataroomId}. Fetching permissions.`);
      fetchPermissionLevel(dataroomId);
    } else if (!dataroomId) {
      console.log("Layout: No dataroomId found.");
      setLoading(false);
      setHasPermission(false);
    }
  }, [dataroomId, currentDataroomId]);

  const handleReturnToDashboard = () => {
    router.push('/dashboard');
  };

  if (isLoadingPermissions) {
    console.log("Layout: Rendering Loading State");
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
    console.log("Layout: Rendering No Permission State");
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

  console.log("Layout: Rendering Children");
  return <>{children}</>;
}


