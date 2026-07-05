import React from "react";

function TextInput({ text, setText, handleAnalyze, loading }) {
  return (
    <div className="text-input">
      <textarea
        placeholder="Type your text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze"}
      </button>
    </div>
  );
}

export default TextInput;
