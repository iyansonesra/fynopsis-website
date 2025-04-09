"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useParams } from 'next/navigation';
import { get } from 'aws-amplify/api';
import { CircularProgress } from "@mui/material";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation'; // Import useRouter

// Define the shape of the context data
interface DataroomContextProps {
  permissionDetails: any;
  isLoadingPermissions: boolean;
  hasPermission: boolean;
  dataroomId: string | null; // Make dataroomId available in context
}

// Create the context with a default value
const DataroomContext = createContext<DataroomContextProps | undefined>(undefined);

// Custom hook to use the Dataroom context
export const useDataroomContext = () => {
  const context = useContext(DataroomContext);
  if (context === undefined) {
    throw new Error('useDataroomContext must be used within a DataroomLayout');
  }
  return context;
};

// Define the props for the layout, including children
interface DataroomLayoutProps {
  children: React.ReactNode;
}

export default function DataroomLayout({ children }: DataroomLayoutProps) {
  const params = useParams();
  const router = useRouter(); // Initialize useRouter
  const [permissionDetails, setPermissionDetails] = useState<any>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean>(true); // Assume permission initially
  const [currentDataroomId, setCurrentDataroomId] = useState<string | null>(null);

  // Extract dataroomId from params
  const dataroomId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? null;
  const bucketUuid = dataroomId; // Use dataroomId for bucketUuid

  // Function to fetch permissions
  const fetchPermissionLevel = async (id: string) => {
    // Only start loading if we don't have details or the ID changed
     if (!permissionDetails || id !== currentDataroomId) {
        console.log(`Layout: Setting loading true for dataroom: ${id}`);
        setIsLoadingPermissions(true);
        setPermissionDetails(null); // Clear old details when fetching for new ID
     } else {
        console.log(`Layout: Permissions already loaded for ${id}, skipping fetch.`);
        return; // Skip fetch if details for current ID are already loaded
     }


    try {
      console.log(`Layout: Fetching permissions for dataroom: ${id}`);
      const restOperation = get({
        apiName: 'S3_API',
        path: `/share-folder/${id}/get-permissions`, // Use the passed id
        options: {
          headers: { 'Content-Type': 'application/json' },
        },
      });

      const { body } = await restOperation.response;
      const responseText = await body.text();
      const response = JSON.parse(responseText);

      console.log("Layout: Permission response:", response);
      setPermissionDetails(response.permissionDetails);
      setHasPermission(true); // Set permission true on successful fetch

    } catch (error) {
      console.error("Layout: Error fetching permissions:", error);
      setPermissionDetails(null);
      setHasPermission(false); // Set permission false on error
    } finally {
      console.log(`Layout: Finished fetching permissions for ${id}, setting loading false.`);
      setIsLoadingPermissions(false);
    }
  };

  // Effect to fetch permissions when dataroomId changes
  useEffect(() => {
    console.log(`Layout: useEffect triggered. dataroomId: ${dataroomId}, currentDataroomId: ${currentDataroomId}`);
    if (dataroomId && dataroomId !== currentDataroomId) {
      console.log(`Layout: Dataroom ID changed to ${dataroomId}. Fetching permissions.`);
      setCurrentDataroomId(dataroomId);
      fetchPermissionLevel(dataroomId);
    } else if (dataroomId && !currentDataroomId && !permissionDetails) {
      // Handle initial load case
      console.log(`Layout: Initial load for dataroom ${dataroomId}. Fetching permissions.`);
      setCurrentDataroomId(dataroomId);
      fetchPermissionLevel(dataroomId);
    } else if (!dataroomId) {
        console.log("Layout: No dataroomId found.");
        // Handle case where dataroomId is missing or invalid if needed
        setIsLoadingPermissions(false);
        setHasPermission(false);
    }
  }, [dataroomId, currentDataroomId]); // Depend only on dataroomId and currentDataroomId

  const handleReturnToDashboard = () => {
    router.push('/dashboard');
  };


  // --- Render loading or error state if necessary ---
  if (isLoadingPermissions) {
    console.log("Layout: Rendering Loading State");
    return (
      <div className="grid h-screen place-items-center">
        <div className="flex flex-col items-center gap-4">
          <CircularProgress />
          <p>Loading permissions...</p>
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
   console.log("Layout: Rendering Children with Context");
  // --- Render children wrapped in context provider if permissions are loaded ---
  return (
    <DataroomContext.Provider value={{ permissionDetails, isLoadingPermissions, hasPermission, dataroomId }}>
      {children}
    </DataroomContext.Provider>
  );
}