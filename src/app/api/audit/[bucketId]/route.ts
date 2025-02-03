import { NextRequest, NextResponse } from 'next/server';
import { get } from 'aws-amplify/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { bucketId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      userId: searchParams.get('userId'),
      action: searchParams.get('action'),
      nextToken: searchParams.get('nextToken'),
      limit: searchParams.get('limit') || '50'
    };

    const response = await get({
      apiName: 'S3_API',
      path: `/audit/${params.bucketId}/logs`,
      options: {
        queryParams: Object.fromEntries(
          Object.entries(queryParams).filter((entry): entry is [string, string] => entry[1] != null)
        ) as Record<string, string>,
        withCredentials: true
      }
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
