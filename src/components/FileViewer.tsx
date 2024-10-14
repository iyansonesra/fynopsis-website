import React, { useEffect, useRef, useState } from 'react';
import { Tree, NodeApi, NodeRendererProps } from 'react-arborist';
import { Folder, File, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import WebViewer from "@pdftron/webviewer";

interface FileViewerProps {
    fileUrl: string;
}

const FileViewer: React.FC<FileViewerProps> = ({ fileUrl }) => {
    const viewerDiv = useRef<HTMLDivElement>(null);

    useEffect(() => {
        console.log('fileUrl', fileUrl);
            WebViewer(
                {
                    path: 'lib',
                    initialDoc: "https://vdr-documents.s3.us-east-1.amazonaws.com/us-east-1%3Ab0ba6fcd-a3ae-c222-21c2-c43a55778c58/files/ACC%20311H%20DuPont.xlsx?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIA3BOTPZWRW6L62RNK%2F20241014%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20241014T011304Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEHIaCXVzLWVhc3QtMSJIMEYCIQC7NjF7AtLkszogFIb4oDPAE8X8EPnxkva%2BMJ%2BarC8YuQIhAOGmuwZeuy2QHqkBW8tYspnVSZcG2xDic9tBFBGiZvPNKs0ECMr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQAxoMNzU5MDQyMTMzNDExIgxsBsTIGawzb0zDSEwqoQQLR8mBDZzGulR3kF8cmT9NdvAk1hFHAoBDVuvhQXemrgel6ZdL8kOe0lsyCVPd2hiumKwsrvYujTYF8s636dkVzTGqFNGYBn64bLDFf9HsZ2mnqfLz7HpgY2SDjnv7JD0l0YTJIWdpG6jei1xpwMZ0blORKx43rqSbaib63sO3SqJXtIkh1TVlek%2FS5lPbo4sieLExSpjH5iS5LsON2ICu%2B%2BFYxR855IoIKjoRDBsplzoR1Xjozy0dj4ZlaeBAg36Aql1Yf3THCXknbhKnvAOdIoAkw35uv59hJvNJJ1Ho5lmTaW%2BbMZdhF%2BIDVsVfDNHRdCQmIfmMPRR8H9fSMVVJlfVL5gNewe%2FPT0JN69WFLTmYqiK6A8IXIevCck0lOXcEV1DGlPQb7wFwUpe9nXUE5RBEWmgG%2FVKfRraRdCeF44Mkd4j4sGSo9CK%2FPVqTfLKDwppL3D6VLH1bI1UfJv0YpmgGgKNJwM0MS415bnESmmD2icMwTH04xC5leNt04inMJGCtklrQatRQFRCJnG8%2BbvJM%2B1Nt3DA05pCqEaVtIVRJ7prR6d0J5tr76DwKRUDBsY6gvXVf4DdNu%2BV%2BJTvx8%2Fk0qP3LTNnIoLWisWmaH8%2BMjJRnRe7ezuU8Seeinr5Nrf%2BWU3YOJ4jHSlPVaMJSpsJ%2B9xtkAw%2FGkypfNwXhRHbOrfgv2Y8sdQuNU%2FsAASP%2F9aNz8jZF9fYtZf8Po2%2FGSTDR37G4BjqEArQW7bqOAZS1WjhpR0Ay2tKabx125t%2B3E%2BCWlFxDgm1Fo1ytrk4VOSXN7TWYqiQ21Tq7Zs%2BfrEzJiC25JR0jJ1JRCFkRjgSaPbxrIFIXQmqQFRGK2%2FXdTtxh565phcHy3hU0tdEVF%2F9HDUV%2BznO3lJG5vlMVbr5T8ei1GEuMD4H5F0SJnYkleaWzkojm0HA7c9%2BjRqHRUbXH12KEs6wTLqlJ1HpswYsAcEMRDh34erqodwQt9BTeexG%2FG5ddqaBjLplkMhMjFZpudE%2Fi3njqBVbA907wlxhKslhbTs%2FBsQ%2BSadaiSJvtnA8GhcXrY5Wivuwl61UHG8KDMjksrFXM6An%2BNNEL&X-Amz-Signature=a96e0d648948e5c7cc4c4f31625ca83a3447b3cdea2c175dc719a45a73098ffc&X-Amz-SignedHeaders=host&x-id=GetObject"
                },
                viewerDiv.current as HTMLDivElement
            ).then((instance) => {
            });
        
    }, [fileUrl]);

    return (
        <div className="h-full w-full">
            <div className="webviewer h-full w-full" ref={viewerDiv}></div>
        </div>
    );
};

export default FileViewer;