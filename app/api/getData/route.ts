import { NextResponse } from "next/server";

interface SensorData {
  temperature: number | "NULL";
  humidity: number | "NULL";
  soil_moisture: number | "NULL";
  pir: number | "NULL";
  lastUpdated: number;
  dataEnabled?: boolean;
  pump_status?: boolean;
}

let sensor_data: SensorData = {
  temperature: "NULL",
  humidity: "NULL",
  soil_moisture: "NULL",
  pir: "NULL",
  lastUpdated: 0,
  dataEnabled: true,
  pump_status:false
};

const DISCONNECT_TIMEOUT = 20000; 

export async function POST(request: Request) {
  try {
    const data = await request.json();

    console.log("Received data:", data);

    if (Object.keys(data).length > 0) {
      sensor_data = {
        temperature: data.temperature ?? "NULL",
        humidity: data.humidity ?? "NULL",
        soil_moisture: data.soil_moisture ?? "NULL",
        pir: data.pir ?? "NULL",
        dataEnabled: data.dataEnabled !== undefined ? data.dataEnabled : sensor_data.dataEnabled,
        pump_status: data.pump_status !== undefined ? data.pump_status : sensor_data.pump_status,
        lastUpdated: Date.now(),
      };
    }

    return NextResponse.json(
      { message: "Data received successfully", sensor_data },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      {
        message: "Error processing data",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const currentTime = Date.now();
  let status = "Connected";

  // When data transmission is disabled, return default/last known data with "Stopped" status
  if (!sensor_data.dataEnabled) {
    return NextResponse.json({
      sensor_data: {
        temperature: "-",
        humidity: "-",
        soil_moisture: "-",
        pir: "-",
        lastUpdated: sensor_data.lastUpdated,
        dataEnabled: false,
        pump_status:false,
      },
      status: "Stopped"
    }, { status: 200 });
  }

  // Specifically check for disconnection only when data transmission is enabled
  if (sensor_data.lastUpdated === 0 || 
      currentTime - sensor_data.lastUpdated > DISCONNECT_TIMEOUT) {
    status = "Disconnected";
  }

  return NextResponse.json({
    sensor_data,
    status
  }, { status: 200 });
}