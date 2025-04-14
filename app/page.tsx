"use client";

import { useState, useEffect } from "react";
import { SensorCard } from "./components/SensorCard";
import { ImageUploader } from "./components/ImageUploader";
import {
  Droplet,
  Thermometer,
  Cloud,
  Radar,
  AlertTriangle,
  Unplug,
  RefreshCw,
  Power,
} from "lucide-react";
import { ImageUploader2 } from "./components/ImageUploader2";

type SensorData = {
  temperature: string;
  humidity: string;
  soil_moisture: string;
  pir: string;
  lastUpdated: number;
  dataEnabled: boolean;
  pump_status: boolean;
};

export default function Home() {
  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: "NULL",
    humidity: "NULL",
    soil_moisture: "NULL",
    pir: "NULL",
    lastUpdated: 0,
    dataEnabled: true,
    pump_status: false,
  });
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Connecting");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isPumpToggling, setIsPumpToggling] = useState(false);
  const [pumpState, setPump] = useState(false);

  // Add this useEffect to monitor pump state changes
  useEffect(() => {
    console.log("Pump state changed:", pumpState);
  }, [pumpState]);

  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/reload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to refresh data");
      }

      const { message } = await response.json();
      console.log(message);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSensorData = async () => {
    try {
      setIsRefreshing(true);
      setErrorMessage(null);

      const response = await fetch("/api/getData");

      if (!response.ok) {
        throw new Error("Failed to fetch sensor data");
      }

      const { sensor_data, status } = await response.json();

      // Log the incoming pump status for debugging
      console.log("API pump status:", sensor_data.pump_status);

      setSensorData((prev) => ({
        ...prev,
        ...(sensor_data || {}),
        lastUpdated: sensor_data?.lastUpdated || prev.lastUpdated,
        dataEnabled: sensor_data?.dataEnabled ?? prev.dataEnabled,
      }));

      setConnectionStatus(status);
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error occurred"
      );

      // Only set to disconnected if data is enabled
      if (sensorData.dataEnabled) {
        setConnectionStatus("Disconnected");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleDataTransmission = async () => {
    try {
      setIsToggling(true);
      const response = await fetch("/api/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to toggle data transmission");
      }

      // Update local state immediately for better UX
      setSensorData((prev) => ({
        ...prev,
        dataEnabled: !prev.dataEnabled,
      }));

      // Fetch updated status after toggling
      await fetchSensorData();
    } catch (error) {
      console.error("Error toggling data transmission:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to toggle"
      );
      // Revert state if toggle failed
      setSensorData((prev) => ({
        ...prev,
        dataEnabled: !prev.dataEnabled,
      }));
    } finally {
      setIsToggling(false);
    }
  };

  const togglePump = async () => {
    try {
      setIsPumpToggling(true);

      // Update local state immediately for better UX
      const newPumpState = !pumpState;
      setPump(newPumpState);

      const response = await fetch("/api/pump", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // If API call fails, revert the state
        setPump(!newPumpState);
        throw new Error("Failed to toggle Pump");
      }

      // Fetch updated status after toggling to ensure sync
      await fetchSensorData();
    } catch (error) {
      console.error("Error toggling pump:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to toggle pump"
      );
    } finally {
      setIsPumpToggling(false);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const intervalId = setInterval(fetchSensorData, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const renderDisconnectionPopup = () => {
    // Show disconnection popup only when data is enabled and status is disconnected
    if (connectionStatus === "Disconnected" && sensorData.dataEnabled) {
      return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'>
          <div className='bg-gray-800 p-8 rounded-2xl text-center max-w-md shadow-2xl border border-red-500/30'>
            <Unplug className='mx-auto mb-4 text-red-500 w-16 h-16' />
            <h2 className='text-2xl font-bold text-red-400 mb-4'>
              Device Disconnected
            </h2>
            <p className='text-gray-300 mb-6'>
              The IoT device is not responding. Please check the connection and
              ensure the device is powered on.
            </p>
            <button
              onClick={fetchSensorData}
              className='bg-red-500/20 text-red-300 hover:bg-red-500/30 px-6 py-3 rounded-full transition-all'>
              Retry Connection
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderStatusBanner = () => {
    if (connectionStatus === "Stopped") {
      return (
        <div className='bg-yellow-500/20 border border-yellow-500 text-yellow-300 p-4 rounded-lg mb-6 flex items-center justify-center'>
          <AlertTriangle className='mr-4' />
          Data transmission is currently disabled
        </div>
      );
    }
    return null;
  };

  // Always show data, but display differently based on state
  const shouldShowData = true;

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 p-8'>
      {renderDisconnectionPopup()}

      <div className='container mx-auto'>
        <div className='flex justify-between items-center mb-8'>
          <h1 className='text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600'>
            IoT Sensor Dashboard
          </h1>
          <div className='flex gap-4'>
            <button
              onClick={toggleDataTransmission}
              className={`
                flex items-center space-x-2 
                ${
                  sensorData.dataEnabled
                    ? "bg-green-500/20 hover:bg-green-500/30"
                    : "bg-red-500/20 hover:bg-red-500/30"
                }
                text-white px-4 py-2 rounded-full 
                transform transition-all duration-300
                hover:scale-105 hover:shadow-lg
                ${isToggling ? "animate-pulse" : ""}
              `}
              disabled={isToggling}>
              <Power size={20} />
              <span>
                {sensorData.dataEnabled ? "Stop Data" : "Start Data"}
                {isToggling ? "..." : ""}
              </span>
            </button>
            <button
              onClick={togglePump}
              className={`
                flex items-center space-x-2 
                ${
                  pumpState
                    ? "bg-red-500/20 hover:bg-red-500/30"
                    : "bg-green-500/20 hover:bg-green-500/30"
                }
                text-white px-4 py-2 rounded-full 
                transform transition-all duration-300
                hover:scale-105 hover:shadow-lg
                ${isPumpToggling ? "animate-pulse" : ""}
              `}
              // disabled={isPumpToggling}
            >
              <Power size={20} />
              <span>
                {pumpState ? "Stop Pump" : "Start Pump"}
                {isPumpToggling ? "..." : ""}
              </span>
            </button>
            <button
              onClick={refreshData}
              className={`
                flex items-center space-x-2 
                bg-gradient-to-r from-blue-500 to-purple-600 
                text-white px-4 py-2 rounded-full 
                transform transition-all duration-300
                hover:scale-105 hover:shadow-lg
                ${isRefreshing ? "animate-pulse" : ""}
              `}
              disabled={isRefreshing}>
              <RefreshCw size={20} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className='bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6 flex items-center'>
            <AlertTriangle className='mr-4' />
            <span>{errorMessage}</span>
          </div>
        )}

        {renderStatusBanner()}

        {shouldShowData && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
            <div className='bg-white/10 backdrop-blur-lg rounded-2xl p-6 col-span-full shadow-2xl border border-white/10'>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                <SensorCard
                  title='Temperature'
                  value={sensorData.dataEnabled ? sensorData.temperature : "-"}
                  unit={sensorData.dataEnabled ? "°C" : ""}
                  icon={
                    <Thermometer
                      className={
                        sensorData.dataEnabled
                          ? "text-red-400"
                          : "text-gray-500"
                      }
                    />
                  }
                  className='bg-red-500/10'
                  disabled={!sensorData.dataEnabled}
                />
                <SensorCard
                  title='Soil Moisture'
                  value={
                    sensorData.dataEnabled ? sensorData.soil_moisture : "-"
                  }
                  unit={sensorData.dataEnabled ? "%" : ""}
                  icon={
                    <Droplet
                      className={
                        sensorData.dataEnabled
                          ? "text-blue-400"
                          : "text-gray-500"
                      }
                    />
                  }
                  className='bg-blue-500/10'
                  disabled={!sensorData.dataEnabled}
                />
                <SensorCard
                  title='Humidity'
                  value={sensorData.dataEnabled ? sensorData.humidity : "-"}
                  unit={sensorData.dataEnabled ? "%" : ""}
                  icon={
                    <Cloud
                      className={
                        sensorData.dataEnabled
                          ? "text-indigo-400"
                          : "text-gray-500"
                      }
                    />
                  }
                  className='bg-indigo-500/10'
                  disabled={!sensorData.dataEnabled}
                />
                <SensorCard
                  title='PIR Sensor'
                  value={
                    sensorData.dataEnabled
                      ? sensorData.pir === "1"
                        ? "No Object Detected"
                        : "Object Detected"
                      : "-"
                  }
                  unit=''
                  icon={
                    <Radar
                      className={
                        sensorData.dataEnabled
                          ? "text-green-400"
                          : "text-gray-500"
                      }
                    />
                  }
                  className='bg-green-500/10'
                  disabled={!sensorData.dataEnabled}
                />
              </div>
            </div>

            <div className='bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/10 col-span-full'>
              <ImageUploader />
            </div>

            <div className='bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/10 col-span-full'>
              <ImageUploader2 />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
