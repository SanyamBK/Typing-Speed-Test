import { useState, useEffect } from "react";

// Helper function to determine the backend domain (essential for deployment)
function getBackendDomain() {
    // During local development, just point to localhost:8080
    const host = window.location.hostname;
    if (!host || host === "localhost" || host === "127.0.0.1") {
        return "http://localhost:8080";
    }

    // For deployed environments, assume backend is at subdomain-backend.example.com
    try {
        const protocolPrefix = window.location.protocol ? window.location.protocol + "//" : "https://";
        const firstDotIndex = host.indexOf(".");
        if (firstDotIndex <= 0) return protocolPrefix + host; // fallback
        const subdomain = host.substring(0, firstDotIndex);
        const restOfDomain = host.substring(firstDotIndex);
        return protocolPrefix + subdomain + "-backend" + restOfDomain;
    } catch (e) {
        // Fallback to localhost to avoid breaking the UI
        console.warn("Could not determine backend domain, falling back to localhost:", e);
        return "http://localhost:8080";
    }
}

function App() {
    // State Initialization
    const [input, setInput] = useState("");
    const [startTime, setStartTime] = useState(null);
    const [result, setResult] = useState("");
    const [name, setName] = useState("");
    const [leaderboard, setLeaderboard] = useState([]);
    const [isStarted, setIsStarted] = useState(false);

    const sampleText = "The quick brown fox jumps over the lazy dog";
    const backendDomain = getBackendDomain();

    // API Call: Fetch leaderboard (Corrected to handle response structure)
    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`${backendDomain}/leaderboard`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error(`Failed to fetch leaderboard (${res.status})`);
            const data = await res.json();
            setLeaderboard(data.leaderboard || []);
        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            // keep existing leaderboard if present, otherwise clear
            setLeaderboard((prev) => (prev && prev.length ? prev : []));
        }
    };

    // API Call: Save score
    const saveScore = async (name, wpm) => {
        try {
            const res = await fetch(`${backendDomain}/score`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, wpm }),
            });
            if (!res.ok) throw new Error(`Failed to save score (${res.status})`);
            return await res.json();
        } catch (error) {
            console.error("Error saving score:", error);
            throw error;
        }
    };

    // Main typing logic
    const handleInput = async (e) => {
        const value = e.target.value;
        setInput(value);

        // Start timer on first keystroke
        if (!startTime && isStarted) setStartTime(new Date());

        // Check for test completion: must match sample text exactly
        if (value.length === sampleText.length && value === sampleText) {
            const endTime = new Date();
            const timeTaken = (endTime - startTime) / 1000 / 60; // in minutes
            const words = sampleText.split(" ").filter(Boolean).length;
            const wpm = Math.round(words / timeTaken);

            // Calculate Accuracy
            let correctChars = 0;
            for (let i = 0; i < value.length; i++) {
                if (value[i] === sampleText[i]) correctChars++;
            }
            const accuracy = Math.round((correctChars / sampleText.length) * 100);

            setResult(`🎉 ${name}, you typed at ${wpm} WPM with ${accuracy}% accuracy!`);

            try {
                await saveScore(name, wpm);
                await fetchLeaderboard(); // Refresh leaderboard after saving
            } catch (e) {
                // If saving failed, still show result but inform in console
                console.warn("Save failed, leaderboard might be out of sync:", e);
            }

            setIsStarted(false); // Stop the test
        }
    };

    // Reset test state
    const handleStart = () => {
        setInput("");
        setResult("");
        setStartTime(null);
        setIsStarted(true);
    };

    // Fetch leaderboard on initial load
    useEffect(() => {
        fetchLeaderboard();
    }, []);

    return (
        <div style={{ textAlign: "center", marginTop: "30px" }}>
            <h1>Typing Speed Test</h1>
            <p>{sampleText}</p>

            {/* Name Input */}
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                style={{ width: "80%", padding: "10px", fontSize: "16px", marginBottom: "10px" }}
                disabled={isStarted}
            />

            <br />

            {/* Start Button */}
            <button
                onClick={handleStart}
                style={{ padding: "10px 20px", fontSize: "16px", marginBottom: "15px", cursor: "pointer" }}
                disabled={!name || isStarted}
            >
                Start Test
            </button>

            <br />

            {/* Typing Input Box: always visible, disabled when test not started or after completion */}
            <input
                type="text"
                value={input}
                onChange={handleInput}
                style={{ width: "80%", padding: "10px", fontSize: "16px" }}
                placeholder="Start typing here..."
                disabled={!isStarted}
                autoFocus={isStarted}
            />

            {/* Result Message */}
            <p>{result}</p>

            {/* Leaderboard UI */}
            <h2>🏆 Leaderboard</h2>
            <div style={{
                maxWidth: '400px',
                margin: '20px auto',
                border: '1px solid #ccc',
                borderRadius: '8px',
                textAlign: 'left'
            }}>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', fontWeight: 'bold', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ccc' }}>
                    <span style={{ minWidth: '40px' }}>Rank</span>
                    <span style={{ flexGrow: 1 }}>Name</span>
                    <span style={{ minWidth: '80px', textAlign: 'right' }}>WPM</span>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {leaderboard.length === 0 ? (
                        <li style={{ padding: '10px', textAlign: 'center', color: '#888' }}>
                            No scores yet. Complete a test to see the ranking!
                        </li>
                    ) : (
                        leaderboard.map((score, index) => (
                            <li
                                key={score.name}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '10px',
                                    borderBottom: index < leaderboard.length - 1 ? '1px solid #eee' : 'none',
                                    backgroundColor: 'white'
                                }}
                            >
                                {/* Rank */}
                                <span style={{ minWidth: '40px', fontWeight: 'bold' }}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                </span>
                                {/* Name */}
                                <span style={{ flexGrow: 1 }}>{score.name}</span>
                                {/* WPM */}
                                <span style={{ minWidth: '80px', textAlign: 'right', fontWeight: 'bold' }}>
                                    {score.wpm}
                                </span>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}

export default App;