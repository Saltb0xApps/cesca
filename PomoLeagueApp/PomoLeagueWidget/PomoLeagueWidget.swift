import WidgetKit
import SwiftUI

// Home/lock-screen widget showing today's completed pomos vs goal.
// This file belongs to a SEPARATE "Widget Extension" target — see
// ../WIDGET_SETUP.md for the ~5-minute Xcode steps to add it. It reads the
// shared App Group the app writes to (group.com.cesca.pomoleague).

private let appGroup = "group.com.cesca.pomoleague"
private let tomatoRed = Color(red: 0.902, green: 0.227, blue: 0.180)

struct PomoEntry: TimelineEntry {
    let date: Date
    let today: Int
    let goal: Int
}

struct PomoProvider: TimelineProvider {
    private var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    private func current() -> PomoEntry {
        let d = defaults
        return PomoEntry(date: Date(),
                         today: d?.integer(forKey: "today") ?? 0,
                         goal: max(1, d?.integer(forKey: "goal") ?? 8))
    }

    func placeholder(in context: Context) -> PomoEntry {
        PomoEntry(date: Date(), today: 3, goal: 8)
    }

    func getSnapshot(in context: Context, completion: @escaping (PomoEntry) -> Void) {
        completion(current())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PomoEntry>) -> Void) {
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        completion(Timeline(entries: [current()], policy: .after(next)))
    }
}

struct PomoLeagueWidgetEntryView: View {
    var entry: PomoEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("🍅 \(entry.today)/\(entry.goal)").font(.headline.bold())
                Spacer()
                if entry.today >= entry.goal { Text("✓").foregroundStyle(tomatoRed).bold() }
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 22), spacing: 4)], spacing: 4) {
                ForEach(0..<max(entry.goal, entry.today), id: \.self) { i in
                    Text("🍅").font(.system(size: 16)).opacity(i < entry.today ? 1 : 0.18)
                }
            }
            Spacer(minLength: 0)
            Text(entry.today >= entry.goal ? "Goal smashed" : "\(max(0, entry.goal - entry.today)) to go")
                .font(.caption2).foregroundStyle(.secondary)
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }
}

@main
struct PomoLeagueWidget: Widget {
    let kind = "PomoLeagueWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PomoProvider()) { entry in
            PomoLeagueWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Today's pomos")
        .description("Your deep-focus progress for the day.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
