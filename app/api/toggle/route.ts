import { NextResponse } from "next/server";
const ARDUINO_URL = process.env.ARDUINO_URL;
export async function POST(request: Request) {
  try {
    if (!ARDUINO_URL) {
      throw new Error('ARDUINO_URL environment variable is not defined');
    }
    // Send request to ESP8266 to toggle
    const espResponse = await fetch(ARDUINO_URL+"/toggle", {
      method: 'GET',
      
    });

    if (!espResponse.ok) {
      throw new Error('Failed to toggle on ESP device');
    }

    const responseText = await espResponse.text();
    console.log('ESP Toggle Response:', responseText);

    return NextResponse.json(
      { success: true, message: "Toggle request sent successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error toggling data transmission:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error toggling data transmission",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}