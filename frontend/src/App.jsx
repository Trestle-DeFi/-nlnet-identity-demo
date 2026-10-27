import { useState } from "react";
const API = "https://n-identity.dydise1.workers.dev";
export default function App() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [gigs, setGigs] = useState([]);
  const [wallet, setWallet] = useState("");
  const [score, setScore] = useState(25);
  const [linked, setLinked] = useState(4);
  const [verify, setVerify] = useState(null);
  const [selected, setSelected] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [log, setLog] = useState([]);
  const L = (m) => setLog((l) => [...l, `${new Date().toLocaleTimeString()} ${m}`]);
  const createGig = async () => {
    const r = await fetch(`${API}/gigs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description: desc }) });
    const d = await r.json(); L(`Created gig ${d.id}`); setGigs((g) => [...g, d]); setTitle(""); setDesc("");
  };
  const loadGigs = async () => { const r = await fetch(`${API}/gigs`); const d = await r.json(); setGigs(d.gigs); L("Loaded gigs"); };
  const doVerify = async () => {
    const r = await fetch(`${API}/identity/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet, passportScore: Number(score), linkedAccounts: Number(linked) }) });
    const d = await r.json(); setVerify(d); L(`Verify ${wallet}: ${d.eligible ? "eligible" : "not eligible"} ${d.reasons.join(",")}`);
  };
  const assign = async () => { const r = await fetch(`${API}/gigs/${selected}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wallet }) }); const d = await r.json(); L(`Assign: ${JSON.stringify(d)}`); loadGigs(); };
  const complete = async () => { const r = await fetch(`${API}/gigs/${selected}/complete`, { method: "POST" }); const d = await r.json(); L(`Complete: ${JSON.stringify(d)}`); loadGigs(); };
  const review = async () => { const r = await fetch(`${API}/gigs/${selected}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: Number(rating), comment }) }); const d = await r.json(); L(`Review: ${JSON.stringify(d)}`); loadGigs(); };
  return (
    <div style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>NLnet Identity Demo</h1>
      <p>Non-financial gig workflow using a reusable identity/Sybil-resistance kit (server-validated).</p>
      <section><h2>1. Create gig</h2>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button onClick={createGig}>Create</button> <button onClick={loadGigs}>Refresh gigs</button>
      </section>
      <section><h2>2. Verify freelancer</h2>
        <input placeholder="Wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} />
        <input type="number" placeholder="Passport score" value={score} onChange={(e) => setScore(e.target.value)} />
        <input type="number" placeholder="Linked accounts" value={linked} onChange={(e) => setLinked(e.target.value)} />
        <button onClick={doVerify}>Verify</button>
        {verify && <pre>{JSON.stringify(verify, null, 2)}</pre>}
      </section>
      <section><h2>3. Gig lifecycle</h2>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select gig</option>
          {gigs.map((g) => <option key={g.id} value={g.id}>{g.title} ({g.status})</option>)}
        </select>
        <button onClick={assign}>Assign (verified freelancer)</button>
        <button onClick={complete}>Complete</button>
        <input type="number" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
        <input placeholder="Review comment" value={comment} onChange={(e) => setComment(e.target.value)} />
        <button onClick={review}>Review</button>
      </section>
      <section><h2>Gigs</h2><pre>{JSON.stringify(gigs, null, 2)}</pre></section>
      <section><h2>Log</h2><pre>{log.join("\n")}</pre></section>
    </div>
  );
}
