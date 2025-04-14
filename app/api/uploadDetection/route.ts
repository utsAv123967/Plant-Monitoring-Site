import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No valid file uploaded' },
        { status: 400 }
      );
    }

    // Convert the file to ArrayBuffer
    const fileArrayBuffer = await (file as File).arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    // Log information for debugging
    console.log('File details:', {
      name: (file as File).name,
      type: (file as File).type,
      size: (file as File).size
    });

    // Create proper form data with content type boundaries
    const formDataToSend = new FormData();
    const fileBlob = new Blob([fileBuffer], { type: (file as File).type });
    formDataToSend.append('file', fileBlob, (file as File).name);

    // FastAPI endpoint
    const fastApiUrl = 'http://localhost:8000/detect-leaves';
    console.log('Sending request to:', fastApiUrl);

    const fastApiResponse = await fetch(fastApiUrl, {
      method: 'POST',
      body: formDataToSend,
    });

    console.log('Response status:', fastApiResponse.status);

    if (!fastApiResponse.ok) {
      let errorMessage;
      try {
        const errorData = await fastApiResponse.json();
        errorMessage = JSON.stringify(errorData);
      } catch (e) {
        errorMessage = await fastApiResponse.text();
      }
      throw new Error(`FastAPI error: ${errorMessage}`);
    }

    const data = await fastApiResponse.json();
    return NextResponse.json({ prediction: data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}