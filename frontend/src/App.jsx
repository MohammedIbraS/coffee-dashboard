import { useState, useEffect } from "react";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { ChatPanel } from "./components/Chatbot/ChatPanel";
import "./App.css";

function App() {
  const [pinnedCharts, setPinnedCharts] = useState([]);
  const [toast, setToast] = useState(false);

  const handleChartGenerated = (spec) => {
    setPinnedCharts((prev) => [...prev, { id: Date.now(), spec }]);
    setToast(true);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDismissChart = (id) => {
    setPinnedCharts((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="app-layout">
      <div className="dashboard-area">
        <Dashboard
          pinnedCharts={pinnedCharts}
          onDismissChart={handleDismissChart}
          onClearAllCharts={() => setPinnedCharts([])}
        />
      </div>
      <ChatPanel onChartGenerated={handleChartGenerated} />
      {toast && (
        <div className="toast">
          Chart pinned to dashboard
        </div>
      )}
    </div>
  );
}

export default App;
