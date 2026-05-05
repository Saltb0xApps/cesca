import SwiftUI
import SwiftData
import Charts

struct StatsView: View {
    @Query private var strokes: [StrokeRecord]
    @State private var selectedDay: Date = Calendar.current.startOfDay(for: .now)

    private var perDay: [DayBucket] {
        let cal = Calendar.current
        let groups = Dictionary(grouping: strokes) { cal.startOfDay(for: $0.startedAt) }
        return groups.map { day, items in
            let pages = Set(items.compactMap { $0.page?.id }).count
            let minutes = Set(items.map { minuteIndex(of: $0.startedAt, calendar: cal) }).count
            return DayBucket(day: day, pages: pages, activeMinutes: minutes)
        }
        .sorted { $0.day < $1.day }
    }

    private var strokesForSelectedDay: [StrokeRecord] {
        let cal = Calendar.current
        return strokes.filter { cal.isDate($0.startedAt, inSameDayAs: selectedDay) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                section(title: "Pages per day") {
                    Chart(perDay) { bucket in
                        BarMark(
                            x: .value("Day", bucket.day, unit: .day),
                            y: .value("Pages", bucket.pages)
                        )
                        .foregroundStyle(bucket.day == selectedDay ? Color.accentColor : Color.accentColor.opacity(0.5))
                    }
                    .frame(height: 180)
                    .chartXAxis {
                        AxisMarks(values: .stride(by: .day, count: 1)) { _ in
                            AxisGridLine()
                            AxisValueLabel(format: .dateTime.day().month(.narrow))
                        }
                    }
                }

                section(title: "Pick a day") {
                    DatePicker("Day", selection: $selectedDay, displayedComponents: .date)
                        .datePickerStyle(.graphical)
                        .onChange(of: selectedDay) { _, new in
                            selectedDay = Calendar.current.startOfDay(for: new)
                        }
                }

                section(title: "Activity on \(selectedDay.formatted(date: .complete, time: .omitted))") {
                    let buckets = minuteBuckets(for: strokesForSelectedDay)
                    if buckets.isEmpty {
                        Text("No writing on this day.")
                            .foregroundStyle(.secondary)
                    } else {
                        Chart(buckets) { bucket in
                            RectangleMark(
                                xStart: .value("Start", bucket.start),
                                xEnd: .value("End", bucket.end),
                                yStart: .value("y", 0),
                                yEnd: .value("y", 1)
                            )
                            .foregroundStyle(Color.accentColor)
                        }
                        .chartXScale(domain: dayDomain(for: selectedDay))
                        .chartYAxis(.hidden)
                        .frame(height: 80)

                        Text(buckets.summary)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Stats")
    }

    private func section<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.headline)
            content()
        }
    }

    private func dayDomain(for day: Date) -> ClosedRange<Date> {
        let start = Calendar.current.startOfDay(for: day)
        let end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
        return start...end
    }

    private func minuteIndex(of date: Date, calendar: Calendar) -> Int {
        let comps = calendar.dateComponents([.hour, .minute], from: date)
        return (comps.hour ?? 0) * 60 + (comps.minute ?? 0)
    }

    /// Coalesce strokes into contiguous minute-buckets (≤ 2 min gap = same bucket).
    private func minuteBuckets(for strokes: [StrokeRecord]) -> [MinuteBucket] {
        let sorted = strokes.sorted { $0.startedAt < $1.startedAt }
        var buckets: [MinuteBucket] = []
        for s in sorted {
            if let last = buckets.last,
               s.startedAt.timeIntervalSince(last.end) < 120 {
                buckets[buckets.count - 1] = MinuteBucket(
                    start: last.start,
                    end: max(last.end, s.endedAt)
                )
            } else {
                buckets.append(MinuteBucket(start: s.startedAt, end: s.endedAt))
            }
        }
        return buckets
    }
}

private struct DayBucket: Identifiable {
    let day: Date
    let pages: Int
    let activeMinutes: Int
    var id: Date { day }
}

private struct MinuteBucket: Identifiable {
    let start: Date
    let end: Date
    var id: Date { start }
}

private extension Array where Element == MinuteBucket {
    var summary: String {
        let totalSeconds = reduce(0) { $0 + $1.end.timeIntervalSince($1.start) }
        let minutes = Int((totalSeconds / 60).rounded())
        return "\(count) writing session\(count == 1 ? "" : "s") · ~\(minutes) min total"
    }
}
