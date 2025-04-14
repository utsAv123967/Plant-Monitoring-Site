"use client";

import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");

  const handleGenerate = async () => {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    setResponse(data.result);
  };

  return (
    <div className='p-4'>
      <textarea
        placeholder='Enter your prompt...'
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className='w-full border rounded p-2'
      />
      <button
        onClick={handleGenerate}
        className='mt-2 px-4 py-2 bg-blue-500 text-white rounded'>
        Generate
      </button>
      <pre className='mt-4 bg-gray-100 p-4 rounded'>{response}</pre>
    </div>
  );
}
