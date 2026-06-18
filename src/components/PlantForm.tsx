"use client";

import { useRef, useState } from "react";
import { DrawingCanvas } from "./DrawingCanvas";
import { plantThing } from "@/app/garden/actions";

// Plant something you like: name it, draw it. The drawing is submitted as a
// base64 PNG via a hidden field to the plantThing server action.
export function PlantForm() {
  const [drawing, setDrawing] = useState("");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="card" style={{ marginTop: 28 }}>
      <h3 style={{ marginTop: 0 }}>+ plant something you like</h3>
      <form
        ref={formRef}
        action={async (fd) => {
          setPending(true);
          fd.set("drawing", drawing);
          await plantThing(fd);
          setDrawing("");
          formRef.current?.reset();
          setPending(false);
        }}
      >
        <label htmlFor="label">What is it?</label>
        <input id="label" name="label" className="field" placeholder="my grandmother's radio" required maxLength={60} />

        <label htmlFor="tags">Tags (comma separated)</label>
        <input id="tags" name="tags" className="field" placeholder="analog, warm, slow" />

        <DrawingCanvas onChange={setDrawing} />

        <button className="btn" type="submit" disabled={pending}>
          {pending ? "planting…" : "plant it"}
        </button>
      </form>
    </div>
  );
}
