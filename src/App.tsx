import { useState } from "react";
import { Landing } from "./components/Landing";
import { Editor } from "./components/Editor";

type View = { name: "landing" } | { name: "editor"; id: string };

export function App() {
  const [view, setView] = useState<View>({ name: "landing" });

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
