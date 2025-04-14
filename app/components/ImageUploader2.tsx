"use client";

import React, { useState } from "react";
import { Upload, Image as ImageIcon, Lightbulb, BarChart } from "lucide-react";

export const ImageUploader2: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        setPrediction(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedImage);

    try {
      const response = await fetch("/api/uploadDetection", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      setPrediction(result.prediction);
    } catch (error) {
      console.error("Error:", error);
      setError(
        error instanceof Error ? error.message : "Model prediction failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
      <div>
        <h3 className='text-2xl font-bold text-white/80 mb-4 flex items-center'>
          <Lightbulb className='mr-3 text-yellow-400' />
          PLANT DETECTION MODEL
        </h3>
        <div className='flex flex-col space-y-4'>
          <div className='flex items-center space-x-4'>
            <label className='cursor-pointer'>
              <input
                type='file'
                accept='image/*'
                className='hidden'
                onChange={handleImageChange}
              />
              <div
                className='
                bg-gradient-to-r from-blue-500 to-purple-600 
                text-white p-3 rounded-full 
                hover:scale-110 transition-transform
                flex items-center justify-center
              '>
                <Upload size={24} />
              </div>
            </label>
            {previewUrl ? (
              <div className='relative'>
                <img
                  src={previewUrl}
                  alt='Preview'
                  className='w-32 h-32 object-cover rounded-2xl shadow-lg'
                />
                <span className='block text-sm text-white/60 mt-1'>
                  {selectedImage?.name}
                </span>
              </div>
            ) : (
              <span className='text-white/60'>
                Select an image for analysis
              </span>
            )}
          </div>

          {selectedImage && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`
                bg-gradient-to-r from-green-500 to-teal-600 
                text-white px-6 py-2 rounded-full 
                hover:scale-105 transition-transform
                flex items-center justify-center space-x-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${loading ? "animate-pulse" : ""}
              `}>
              <BarChart size={20} />
              <span>{loading ? "Processing..." : "Analyze Image"}</span>
            </button>
          )}

          {error && (
            <div className='bg-red-500/20 border border-red-500/40 text-red-300 p-4 rounded-lg'>
              {error}
            </div>
          )}
        </div>
      </div>

      {prediction && (
        <div className='flex flex-col h-full'>
          <h4 className='text-xl font-semibold text-white/80 mb-2 flex items-center'>
            <BarChart className='mr-2 text-green-400' />
            Prediction Results
          </h4>
          <div
            className='
            bg-white/10 backdrop-blur-lg 
            rounded-2xl p-4 
            text-white/70 
            overflow-x-auto 
            flex-grow
            max-h-64
            md:max-h-full
          '>
            <pre className='font-mono text-sm'>
              {JSON.stringify(
                {
                  class: prediction.detections[0].class,
                  confidence: prediction.detections[0].confidence,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
