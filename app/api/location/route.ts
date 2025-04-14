// Create a new API route: app/api/get-location/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const { ip } = await ipResponse.json();
    
    const locationResponse = await fetch(`http://ip-api.com/json/${ip}`);
    const locationData = await locationResponse.json();
    
    return NextResponse.json({
      city: locationData.city,
      country: locationData.country,
      lat: locationData.lat,
      lon: locationData.lon,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}