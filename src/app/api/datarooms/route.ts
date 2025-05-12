import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Amplify } from 'aws-amplify';
import { post, get } from 'aws-amplify/api';

// Configure Amplify for server-side use
Amplify.configure({
  API: {
    REST: {
      S3_API: {
        endpoint: `https://${process.env.NEXT_PUBLIC_S3_API_CODE}.execute-api.us-east-1.amazonaws.com/prod`,
        region: process.env.NEXT_PUBLIC_REGION
      }
    }
  }
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restOperation = get({
      apiName: 'S3_API',
      path: '/get-data-rooms',
      options: {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        }
      }
    });

    const { body } = await restOperation.response;
    const responseText = await body.text();
    const response = JSON.parse(responseText);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching data rooms:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bucketName } = body;

    const restOperation = post({
      apiName: 'S3_API',
      path: '/create-data-room',
      options: {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: {
          bucketName
        }
      }
    });

    const { body: responseBody } = await restOperation.response;
    const responseText = await responseBody.text();
    const response = JSON.parse(responseText);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating data room:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 