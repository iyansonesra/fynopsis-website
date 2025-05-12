import { NextResponse } from 'next/server';
import { post } from 'aws-amplify/api';

export async function POST(request: Request) {
    try {
        const { itemId, targetFolderId, bucketUuid } = await request.json();

        // Call the backend API to move the item
        const response = await post({
            apiName: 'S3_API',
            path: `/s3/${bucketUuid}/move-url`,
            options: {
                withCredentials: true,
                body: {
                    fileIds: [itemId],      // Pass id as an array
                    newParentFolderId: targetFolderId
                }
            }
        });

        const { body } = await response.response;
        const result = await body.json();

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error moving item:', error);
        return NextResponse.json(
            { error: 'Failed to move item' },
            { status: 500 }
        );
    }
} 