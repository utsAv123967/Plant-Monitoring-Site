'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [prediction, setPrediction] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
  if (!file) {
    alert('Please select an image!');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (data.prediction) {
    setPrediction(data.prediction);
  } else {
    alert('Error: ' + data.error);
  }
};


  return (
    <div>
      <h1>Upload Image for Prediction</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Predict</button>
      {prediction && <h2>Prediction: {prediction}</h2>}
    </div>
  );
}
