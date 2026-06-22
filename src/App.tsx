import { useEffect, useState } from "react";
import { Landing } from "./components/Landing";
import { Editor } from "./components/Editor";
import { applySettings, loadSettings } from "./lib/settings";

type View = { name: "landing" } | { name: "editor"; id: string };

export function App() {
  const [view, setView] = useState<View>({ name: "landing" });

  useEffect(() => {
    applySettings(loadSettings());
  }, []);

  if (view.name === "editor") {
    return (
      <Editor
        id={view.id}
        onBack={() => setView({ name: "landing" })}
      />
    );
  }
  return <Landing onOpen={(id) => setView({ name: "editor", id })} />;
}
