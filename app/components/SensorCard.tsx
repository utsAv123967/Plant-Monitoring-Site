import React from "react";
import { AlertTriangle, Loader2, CheckCircle, PowerOff } from "lucide-react";

type SensorCardProps = {
  title: string;
  value: number | string | "NULL";
  unit: string;
  icon: React.ReactElement;
  status?: "loading" | "error" | "success" | "warning" | "disabled";
  className?: string;
  disabled?: boolean;
};

export const SensorCard: React.FC<SensorCardProps> = ({
  title,
  value,
  unit,
  icon,
  status,
  className = "",
  disabled = false,
}) => {
  // Status icon mapping
  const statusIcons = {
    loading: <Loader2 className='w-4 h-4 animate-spin text-yellow-400' />,
    error: <AlertTriangle className='w-4 h-4 text-red-400' />,
    success: <CheckCircle className='w-4 h-4 text-green-400' />,
    warning: <AlertTriangle className='w-4 h-4 text-yellow-400' />,
    disabled: <PowerOff className='w-4 h-4 text-gray-400' />,
  };

  // Render appropriate value or status message
  const renderValue = () => {
    if (value === "NULL" || value === null) {
      return "N/A";
    }
    return `${value}${unit}`;
  };

  // Determine if we should show a status icon
  const shouldShowStatusIcon = status && status !== "success";
  const statusIcon = status ? statusIcons[status] : null;

  return (
    <div
      className={`
        rounded-2xl p-5 
        flex flex-col justify-between 
        transition-all duration-300
        border border-white/10
        ${disabled ? "opacity-60 bg-gray-800/30" : "bg-white/10"}
        ${className}
      `}>
      <div className='flex justify-between items-center mb-4'>
        <h2
          className={`text-lg font-semibold ${
            disabled ? "text-white/50" : "text-white/80"
          }`}>
          {title}
        </h2>
        {React.cloneElement(icon, {
          className: `${disabled ? "text-gray-400" : ""} ${
            icon.props.className || ""
          }`,
        })}
      </div>
      <div className='flex justify-between items-center'>
        <span
          className={`text-2xl font-bold ${
            disabled ? "text-gray-400" : "text-white"
          }`}>
          {renderValue()}
        </span>
        {shouldShowStatusIcon && statusIcon}
      </div>
      {status && (
        <div
          className={`mt-2 text-xs uppercase tracking-wider ${
            disabled ? "text-gray-400" : "text-white/60"
          }`}>
          {status === "disabled"
            ? "Disabled"
            : status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      )}
    </div>
  );
};
