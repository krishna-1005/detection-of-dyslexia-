import React from "react";

function CorrectionTable({ misspelled }) {
  if (!misspelled || misspelled.length === 0) {
    return <div>No incorrect words detected.</div>;
  }

  return (
    <table className="correction-table">
      <thead>
        <tr>
          <th>Original</th>
          <th>Best Suggestion</th>
          <th>Other Suggestions</th>
        </tr>
      </thead>
      <tbody>
        {misspelled.map((m, idx) => (
          <tr key={idx}>
            <td>{m.word}</td>
            <td>{m.best}</td>
            <td>{m.suggestions && m.suggestions.slice(0, 5).join(", ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default CorrectionTable;
