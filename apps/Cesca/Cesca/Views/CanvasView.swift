import SwiftUI
import PencilKit

/// `PKCanvasView` wrapped for SwiftUI.
///
/// The view is passive: every change emits `onChange(drawing, addedStrokeStamps)`
/// and the parent decides what to persist. We diff stroke count to detect when
/// new strokes were appended (PencilKit only appends during normal writing;
/// undo/redo can shrink the array, in which case we just re-baseline).
struct CanvasView: UIViewRepresentable {
    let initialDrawing: PKDrawing
    let onChange: (PKDrawing, [(start: Date, end: Date)]) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onChange: onChange, lastStrokeCount: initialDrawing.strokes.count)
    }

    func makeUIView(context: Context) -> PKCanvasView {
        let canvas = PKCanvasView()
        canvas.drawingPolicy = .pencilOnly
        canvas.backgroundColor = .systemBackground
        canvas.isOpaque = false
        canvas.delegate = context.coordinator
        canvas.tool = PKInkingTool(.pen, color: .label, width: 3)
        canvas.drawing = initialDrawing

        DispatchQueue.main.async {
            if let window = canvas.window,
               let picker = PKToolPicker.shared(for: window) {
                picker.setVisible(true, forFirstResponder: canvas)
                picker.addObserver(canvas)
                canvas.becomeFirstResponder()
            }
        }
        return canvas
    }

    func updateUIView(_ canvas: PKCanvasView, context: Context) {
        // Intentionally empty — the canvas is the live source of strokes.
    }

    final class Coordinator: NSObject, PKCanvasViewDelegate {
        var lastStrokeCount: Int
        var lastChangeAt: Date = .now
        let onChange: (PKDrawing, [(start: Date, end: Date)]) -> Void

        init(onChange: @escaping (PKDrawing, [(start: Date, end: Date)]) -> Void,
             lastStrokeCount: Int) {
            self.onChange = onChange
            self.lastStrokeCount = lastStrokeCount
        }

        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            let drawing = canvasView.drawing
            let newCount = drawing.strokes.count

            var added: [(start: Date, end: Date)] = []
            if newCount > lastStrokeCount {
                let now = Date.now
                let count = newCount - lastStrokeCount
                // Distribute the new strokes across the time since the last
                // change — gives us a usable approximation of when they were
                // drawn without per-touch instrumentation.
                let span = max(0.1, min(Double(count) * 2.0, now.timeIntervalSince(lastChangeAt)))
                let perStroke = span / Double(count)
                var t = now
                added.reserveCapacity(count)
                for _ in 0..<count {
                    let end = t
                    let start = t.addingTimeInterval(-perStroke)
                    added.append((start, end))
                    t = start
                }
                added.reverse()
            }
            lastStrokeCount = newCount
            lastChangeAt = .now
            onChange(drawing, added)
        }
    }
}
