import SwiftUI

struct LeagueView: View {
    @EnvironmentObject var ledger: Ledger
    @EnvironmentObject var profile: ProfileStore
    @EnvironmentObject var auth: Auth

    @State private var cohort: Cohort?
    @State private var usingReal = false

    var body: some View {
        let c = cohort ?? demoCohort()
        return ScrollView {
            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("league.")
                        .font(.marker(32))
                        .foregroundStyle(Color.pomoRed)
                    Spacer()
                    // Tier badge
                    Text(c.tierName.uppercased())
                        .font(.caveatBold(13))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 5)
                        .background(Capsule().fill(Tiers.colors[c.tierIndex]))
                }
                .padding(.horizontal, 24)
                .padding(.top, 52)
                .padding(.bottom, 6)

                Text(range(c.weekStart, c.weekEnd))
                    .font(.caveat(14))
                    .foregroundStyle(Color.pomoRedFaded)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 16)

                VStack(spacing: 14) {
                    // Rank + team goal card
                    HStack(spacing: 14) {
                        // Your rank
                        VStack(alignment: .leading, spacing: 0) {
                            SketchLabel("your rank")
                            Text("#\(c.yourRank)")
                                .font(.marker(44))
                                .foregroundStyle(Color.pomoRed)
                                .padding(.top, 6)
                            Text("of \(c.members.count)")
                                .font(.caveat(13))
                                .foregroundStyle(Color.pomoRedFaded)
                                .padding(.top, 2)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .sketchCard()

                        // Team goal
                        VStack(alignment: .leading, spacing: 0) {
                            SketchLabel("team goal")
                            HStack(alignment: .bottom, spacing: 3) {
                                Text("\(c.teamTotal)")
                                    .font(.marker(44))
                                    .foregroundStyle(Color.pomoRed)
                                Text("/ \(c.teamGoal)")
                                    .font(.caveatBold(18))
                                    .foregroundStyle(Color.pomoRedFaded)
                                    .padding(.bottom, 6)
                            }
                            .padding(.top, 6)
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 2).fill(Color.pomoRed.opacity(0.12))
                                    RoundedRectangle(cornerRadius: 2).fill(Color.pomoRed)
                                        .frame(width: geo.size.width * min(1, Double(c.teamTotal) / Double(c.teamGoal)))
                                }
                            }
                            .frame(height: 6)
                            .padding(.top, 4)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .sketchCard()
                    }

                    // Zone labels
                    HStack {
                        HStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color(red: 0.18, green: 0.62, blue: 0.36))
                                .frame(width: 8, height: 8)
                            Text("top \(c.promoteCount) promote")
                                .font(.caveatBold(13))
                                .foregroundStyle(Color(red: 0.18, green: 0.62, blue: 0.36))
                        }
                        Spacer()
                        HStack(spacing: 4) {
                            Text("bottom \(c.relegateCount) relegate")
                                .font(.caveatBold(13))
                                .foregroundStyle(Color.pomoRed.opacity(0.7))
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color.pomoRed.opacity(0.7))
                                .frame(width: 8, height: 8)
                        }
                    }
                    .padding(.horizontal, 2)

                    // Standings list
                    VStack(spacing: 8) {
                        ForEach(Array(c.members.enumerated()), id: \.element.id) { i, m in
                            standingRow(m, rank: i + 1, cohort: c)
                        }
                    }

                    if !usingReal {
                        Text("demo opponents — sign in for a real league.")
                            .font(.caveat(14))
                            .foregroundStyle(Color.pomoRedFaded)
                            .multilineTextAlignment(.center)
                            .padding(.top, 4)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 100)
            }
        }
        .background(Color.pomoBg.ignoresSafeArea())
        .task { await refreshLoop() }
        .refreshable { await refresh() }
    }

    private func standingRow(_ m: Member, rank: Int, cohort c: Cohort) -> some View {
        let promote = rank <= c.promoteCount
        let relegate = rank > c.members.count - c.relegateCount
        let isYou = m.isYou

        return HStack(spacing: 12) {
            // Rank number
            Text("\(rank)")
                .font(.caveatBold(16))
                .foregroundStyle(Color.pomoRedFaded)
                .frame(width: 22, alignment: .center)

            // Zone indicator dot
            Circle()
                .fill(promote ? Color(red: 0.18, green: 0.62, blue: 0.36)
                      : relegate ? Color.pomoRed.opacity(0.55) : Color.clear)
                .frame(width: 6, height: 6)

            Text(m.avatar)
                .font(.system(size: 20))

            Text(m.name)
                .font(isYou ? .caveatBold(18) : .caveat(18))
                .foregroundStyle(isYou ? Color.pomoRed : Color.pomoInk)
                .lineLimit(1)

            Spacer()

            Text("\(m.pomos)")
                .font(.marker(22))
                .foregroundStyle(isYou ? Color.pomoRed : Color.pomoInk)

            Text("pomos")
                .font(.caveat(13))
                .foregroundStyle(Color.pomoRedFaded)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(isYou ? Color.pomoRed.opacity(0.06) : Color.white)
                .overlay(RoundedRectangle(cornerRadius: 4)
                    .stroke(isYou ? Color.pomoRed : Color.pomoRed.opacity(0.2), lineWidth: isYou ? 2 : 1))
        )
    }

    private func demoCohort() -> Cohort {
        DemoLeague.cohort(pomos: ledger.pomos, total: ledger.stats.total,
                          youName: profile.displayName.isEmpty ? "you" : profile.displayName,
                          youAvatar: profile.avatar)
    }

    private func refreshLoop() async {
        await refresh()
        while !Task.isCancelled {
            try? await Task.sleep(nanoseconds: 20_000_000_000)
            await refresh()
        }
    }

    private func refresh() async {
        guard Secrets.isConfigured, auth.session != nil else {
            cohort = demoCohort(); usingReal = false; return
        }
        do {
            let rows = try await auth.withValidSession { try await Supabase.shared.leagueStandings(session: $0) }
            cohort = cohortFrom(rows); usingReal = true
        } catch {
            cohort = demoCohort(); usingReal = false
        }
    }

    private func cohortFrom(_ rows: [Supabase.StandingRow]) -> Cohort {
        let members = rows.map {
            Member(id: $0.user_id, name: $0.is_you ? "you" : $0.display_name,
                   avatar: $0.avatar ?? "🍅", pomos: $0.pomos, isYou: $0.is_you)
        }
        let weekStart = PomoMath.startOfWeek(Date())
        let weekEnd = Calendar.current.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart
        let rank = (members.firstIndex { $0.isYou } ?? 0) + 1
        let idx = Tiers.index(for: ledger.stats.total)
        return Cohort(tierName: Tiers.names[idx], tierIndex: idx, weekStart: weekStart, weekEnd: weekEnd,
                      members: members, yourRank: max(1, rank), teamTotal: members.reduce(0) { $0 + $1.pomos },
                      teamGoal: DemoLeague.teamGoal, promoteCount: 5, relegateCount: 5)
    }

    private func range(_ a: Date, _ b: Date) -> String {
        let f = DateFormatter(); f.dateFormat = "MMM d"
        return "\(f.string(from: a)) – \(f.string(from: b))"
    }
}
