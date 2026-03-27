import { useState } from "react";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { ChatPanel } from "./components/Chatbot/ChatPanel";
import "./App.css";

function App() {
  const [aiChart, setAiChart] = useState(null);

  return (
    <div className="app-layout">
      <div className="dashboard-area">
        <Dashboard aiChart={aiChart} onClearAiChart={() => setAiChart(null)} />
      </div>
      <ChatPanel onChartGenerated={setAiChart} />
    </div>
  );
}

export default App;
