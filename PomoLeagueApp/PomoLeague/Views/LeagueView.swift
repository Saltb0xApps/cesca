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
            VStack(spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("\(c.tierName) League").font(.headline).foregroundStyle(.white)
                            .padding(.horizontal, 12).padding(.vertical, 6)
                            .background(Capsule().fill(Tiers.colors[c.tierIndex]))
                        Text(range(c.weekStart, c.weekEnd)).font(.caption).foregroundStyle(Color.pomoSubtle)
                    }
                    Spacer()
                    VStack { Text("#\(c.yourRank)").font(.title.bold()).foregroundStyle(Color.pomoInk)
                        Text("your rank").font(.caption2).foregroundStyle(Color.pomoSubtle) }
                }

                VStack(alignment: .leading, spacing: 8) {
                    HStack { Text("League goal").bold().foregroundStyle(Color.pomoInk)
                        Spacer(); Text("\(c.teamTotal) / \(c.teamGoal)").bold().foregroundStyle(Color.pomoTomato) }
                    ProgressBar(pct: min(1, Double(c.teamTotal) / Double(c.teamGoal)))
                    Text("Everyone earns a badge if the league banks \(c.teamGoal) pomos together.")
                        .font(.caption).foregroundStyle(Color.pomoSubtle)
                }
                .pomoCard()

                HStack {
                    Text("▲ Top \(c.promoteCount) promote").font(.caption.bold()).foregroundStyle(Color.pomoGood)
                    Spacer()
                    Text("▼ Bottom \(c.relegateCount) relegate").font(.caption.bold()).foregroundStyle(Color.pomoTomatoDark)
                }

                ForEach(Array(c.members.enumerated()), id: \.element.id) { i, m in
                    row(m, rank: i + 1, cohort: c)
                }

                if !usingReal {
                    Text("Demo opponents — sign in (with Supabase configured) for a real league.")
                        .font(.caption).foregroundStyle(Color.pomoSubtle).multilineTextAlignment(.center).padding(.top, 8)
                }
            }
            .padding(16)
        }
        .background(Color.pomoBg.ignoresSafeArea())
        .task { await refreshLoop() }
        .refreshable { await refresh() }
    }

    private func row(_ m: Member, rank: Int, cohort c: Cohort) -> some View {
        let promote = rank <= c.promoteCount
        let relegate = rank > c.members.count - c.relegateCount
        let bg: Color = promote ? Color(red: 0.917, green: 0.969, blue: 0.937)
            : relegate ? Color(red: 0.988, green: 0.929, blue: 0.922) : Color.pomoCard
        let border: Color = m.isYou ? .pomoTomato : (promote ? .pomoGood : relegate ? Color(red: 0.95, green: 0.78, blue: 0.76) : .pomoLine)
        return HStack(spacing: 12) {
            Text("\(rank)").bold().foregroundStyle(Color.pomoSubtle).frame(width: 24)
            Text(m.avatar).font(.title3)
            Text(m.name).font(.subheadline).fontWeight(m.isYou ? .heavy : .semibold)
                .foregroundStyle(m.isYou ? Color.pomoTomato : Color.pomoInk).lineLimit(1)
            Spacer()
            Text("\(m.pomos)").font(.headline).foregroundStyle(m.isYou ? Color.pomoTomato : Color.pomoInk)
        }
        .padding(.horizontal, 12).padding(.vertical, 10)
        .background(RoundedRectangle(cornerRadius: 10).fill(bg)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(border, lineWidth: m.isYou ? 2 : 1)))
    }

    private func demoCohort() -> Cohort {
        DemoLeague.cohort(pomos: ledger.pomos, total: ledger.stats.total,
                          youName: profile.displayName.isEmpty ? "You" : profile.displayName,
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
            Member(id: $0.user_id, name: $0.is_you ? "You" : $0.display_name,
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
