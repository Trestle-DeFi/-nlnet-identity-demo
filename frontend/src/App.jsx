import { useState } from "react";

export default function App() {
  const [status, setStatus] = useState("idle");
  return (
    <div style={{ fontFamily: "sans-serif", padding: 24 }}>
      <h1>NLnet Identity Demo</h1>
      <p>Non-financial gig workflow using a reusable identity/Sybil-resistance kit.</p>
      <ol>
        <li>Create/list a gig</li>
        <li>Verify freelancer (server-validated)</li>
        <li>Assign based on verifiable result</li>
        <li>Complete task</li>
        <li>Record review</li>
      </ol>
      <p>Status: {status}</p>
    </div>
  );
}
