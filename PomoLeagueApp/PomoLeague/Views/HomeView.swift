import SwiftUI

struct HomeView: View {
    @EnvironmentObject var ledger: Ledger
    @EnvironmentObject var profile: ProfileStore
    @EnvironmentObject var tasks: TaskStore
    @EnvironmentObject var partner: PartnerStore
    @EnvironmentObject var auth: Auth

    @State private var showRules = false
    @State private var showRound = false

    var body: some View {
        let stats = ledger.stats
        let goal  = profile.dailyGoal

        ScrollView {
            VStack(spacing: 0) {
                // ── Header ──
                HStack(alignment: .center) {
                    HStack(spacing: 12) {
                        // Tomato avatar box
                        ZStack {
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(Color.pomoRed, lineWidth: 2)
                                .frame(width: 42, height: 42)
                            Text("🍅").font(.system(size: 22))
                        }

                        VStack(alignment: .leading, spacing: 1) {
                            Text("welcome back")
                                .font(.caveat(13))
                                .foregroundStyle(Color.pomoRedFaded)
                            Text(profile.displayName.isEmpty ? "you" : profile.displayName)
                                .font(.marker(20))
                                .foregroundStyle(Color.pomoRed)
                        }
                    }

                    Spacer()

                    // Streak + freeze pills
                    HStack(spacing: 8) {
                        SketchPill(icon: "🔥", value: "\(stats.streak)")
                        SketchPill(icon: "❄️", value: "\(stats.freezes)")
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 52)
                .padding(.bottom, 20)

                // ── Main content ──
                VStack(spacing: 14) {
                    // Today's goal card
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            VStack(alignment: .leading, spacing: 0) {
                                SketchLabel("today's goal")

                                // Big number
                                HStack(alignment: .bottom, spacing: 0) {
                                    Text("\(stats.today)")
                                        .font(.marker(60))
                                        .foregroundStyle(Color.pomoRed)
                                    Text("/ \(goal)")
                                        .font(.caveatBold(26))
                                        .foregroundStyle(Color.pomoRedFaded)
                                        .padding(.bottom, 10)
                                }

                                Text(stats.today >= goal
                                     ? "goal smashed 🎉"
                                     : "\(goal - stats.today) more to go")
                                    .font(.caveat(15))
                                    .foregroundStyle(Color.pomoRedFaded)
                            }

                            Spacer()

                            // Exam tag icon
                            if !profile.examTag.isEmpty {
                                // placeholder icon area
                                Image(systemName: "book.closed")
                                    .foregroundStyle(Color.pomoRedFaded)
                                    .font(.system(size: 20))
                            }
                        }

                        // Segmented progress bar (8 segments)
                        SegmentBar(filled: stats.today, total: goal)
                            .padding(.top, 16)

                        // Exam tag label
                        if !profile.examTag.isEmpty {
                            HStack(spacing: 6) {
                                Image(systemName: "book.closed")
                                    .font(.system(size: 11))
                                    .foregroundStyle(Color.pomoRedFaded)
                                Text(profile.examTag)
                                    .font(.caveat(14))
                                    .foregroundStyle(Color.pomoRedFaded)
                            }
                            .padding(.top, 12)
                        }
                    }
                    .sketchCard()

                    // This week / all-time
                    HStack(spacing: 14) {
                        PomoStatCard(label: "this week", value: stats.week)
                        PomoStatCard(label: "all-time",  value: stats.total)
                    }

                    // START button
                    Button(action: start) {
                        ZStack {
                            Circle()
                                .fill(Color.pomoRed)
                                .frame(width: 200, height: 200)

                            VStack(spacing: 10) {
                                Text("🍅").font(.system(size: 40))
                                Text("START A ROUND")
                                    .font(.marker(15))
                                    .foregroundStyle(.white)
                                    .tracking(0.5)
                                Text("25 min")
                                    .font(.caveatBold(12))
                                    .foregroundStyle(Color.white.opacity(0.65))
                            }
                        }
                    }
                    .padding(.top, 8)
                    .padding(.bottom, 8)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 100)
            }
        }
        .background(Color.pomoBg.ignoresSafeArea())
        .sheet(isPresented: $showRules) {
            RulesView { showRules = false; showRound = true }
        }
        .fullScreenCover(isPresented: $showRound) { RoundView() }
        .onAppear { SharedStore.sync(today: ledger.stats.today, goal: profile.dailyGoal) }
        .task { await partner.settle(auth: auth) } // detect mutual-loss even if Partner tab isn't opened
    }

    private func start() {
        if profile.seenRules { showRound = true } else { showRules = true }
    }
}

// MARK: - Sub-components

private struct SketchPill: View {
    let icon: String
    let value: String

    var body: some View {
        HStack(spacing: 5) {
            Text(icon).font(.system(size: 12))
            Text(value)
                .font(.caveatBold(13))
                .foregroundStyle(Color.pomoRed)
                .tracking(0.5)
        }
        .padding(.horizontal, 13.5)
        .padding(.vertical, 5.5)
        .overlay(RoundedRectangle(cornerRadius: 3).stroke(Color.pomoRed, lineWidth: 1.5))
    }
}

struct SketchLabel: View {
    let text: String
    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text.uppercased())
            .font(.caveatBold(13))
            .foregroundStyle(Color.pomoRedFaded)
            .tracking(1.2)
    }
}

private struct SegmentBar: View {
    let filled: Int
    let total: Int

    var body: some View {
        let segments = max(total, 8)
        GeometryReader { geo in
            let gap: CGFloat = 4
            let w = (geo.size.width - gap * CGFloat(segments - 1)) / CGFloat(segments)
            HStack(spacing: gap) {
                ForEach(0..<segments, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(i < filled ? Color.pomoRed : Color(red: 0.96, green: 0.94, blue: 0.94))
                        .overlay(RoundedRectangle(cornerRadius: 2).stroke(Color.pomoRed, lineWidth: 1))
                        .frame(width: w, height: 8)
                }
            }
        }
        .frame(height: 8)
    }
}

struct PomoStatCard: View {
    let label: String
    let value: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            SketchLabel(label)
            Text("\(value)")
                .font(.marker(44))
                .foregroundStyle(Color.pomoRed)
                .padding(.top, 8)
            Text("pomos")
                .font(.caveat(13))
                .foregroundStyle(Color.pomoRedFaded)
                .padding(.top, 3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .sketchCard()
    }
}

// Keep old StatBox for anything still using it
struct StatBox: View {
    let value: Int
    let label: String
    var body: some View {
        PomoStatCard(label: label, value: value)
    }
}
