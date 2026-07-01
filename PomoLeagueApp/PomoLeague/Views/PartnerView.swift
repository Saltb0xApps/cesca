import SwiftUI

struct PartnerView: View {
    @EnvironmentObject var partner: PartnerStore
    @EnvironmentObject var auth: Auth
    @State private var codeField = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HStack { Text("Partner").font(.largeTitle.bold()).foregroundStyle(Color.pomoInk); Spacer() }

                if partner.lostBanner {
                    Text("💔 You lost your team streak — someone missed their goal.")
                        .font(.subheadline.bold()).foregroundStyle(.white)
                        .frame(maxWidth: .infinity).padding()
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color.pomoTomatoDark))
                }

                if !Secrets.isConfigured || auth.session == nil {
                    Text("Sign in with an account to link up with a partner.")
                        .foregroundStyle(Color.pomoSubtle).multilineTextAlignment(.center).padding(.top, 40)
                } else if let s = partner.summary, s.active {
                    partneredView(s)
                } else {
                    inviteView(pendingCode: partner.summary?.invite_code)
                }
            }
            .padding(16)
        }
        .background(Color.pomoBg.ignoresSafeArea())
        .task { await partner.settle(auth: auth) }
        .refreshable { await partner.refresh(auth: auth) }
    }

    // MARK: Partnered

    private func partneredView(_ s: Supabase.PartnerSummary) -> some View {
        VStack(spacing: 14) {
            VStack(spacing: 4) {
                Text("🔥 \(s.team_streak)").font(.system(size: 44, weight: .black)).foregroundStyle(Color.pomoTomato)
                Text("day team streak with \(s.partner_name ?? "your partner")")
                    .font(.subheadline).foregroundStyle(Color.pomoSubtle)
            }
            .frame(maxWidth: .infinity).pomoCard(padding: 20, radius: 16)

            progressRow(name: "You", avatar: "🍅", today: s.you_today, goal: s.you_goal)
            progressRow(name: s.partner_name ?? "Partner", avatar: s.partner_avatar ?? "🙂",
                        today: s.partner_today ?? 0, goal: s.partner_goal ?? 0)

            Text("If either of you misses today's goal, the streak resets tomorrow. Don't be the reason.")
                .font(.caption).foregroundStyle(Color.pomoSubtle).multilineTextAlignment(.center).padding(.top, 4)
        }
    }

    private func progressRow(name: String, avatar: String, today: Int, goal: Int) -> some View {
        let pct = goal > 0 ? min(1, Double(today) / Double(goal)) : 0
        let hit = goal > 0 && today >= goal
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(avatar).font(.title3)
                Text(name).font(.headline).foregroundStyle(Color.pomoInk)
                Spacer()
                Text("\(today) / \(goal)\(hit ? " ✓" : "")").font(.subheadline.bold())
                    .foregroundStyle(hit ? Color.pomoGood : Color.pomoTomato)
            }
            ProgressBar(pct: pct)
        }
        .pomoCard()
    }

    // MARK: Invite

    private func inviteView(pendingCode: String?) -> some View {
        VStack(spacing: 16) {
            VStack(spacing: 6) {
                Text("Study with a partner").font(.title3.bold()).foregroundStyle(Color.pomoInk)
                Text("Link up with one person. Hit your goals and your team streak grows. Miss them and you both lose it.")
                    .font(.subheadline).foregroundStyle(Color.pomoSubtle).multilineTextAlignment(.center)
            }
            .pomoCard(padding: 18, radius: 16)

            if let code = pendingCode {
                VStack(spacing: 8) {
                    Text("Your invite code").font(.caption.bold()).foregroundStyle(Color.pomoSubtle)
                    Text(code).font(.system(size: 34, weight: .black, design: .monospaced)).foregroundStyle(Color.pomoTomato)
                    ShareLink(item: "Be my focus partner on PomoLeague — enter code \(code)") {
                        Text("Share code").font(.subheadline.bold())
                    }
                }
                .frame(maxWidth: .infinity).pomoCard(padding: 18, radius: 16)
            } else {
                Button { Task { await partner.createInvite(auth: auth) } } label: {
                    Text("Create my invite code").font(.headline).foregroundStyle(.white)
                        .frame(maxWidth: .infinity).padding()
                        .background(RoundedRectangle(cornerRadius: 14).fill(Color.pomoTomato))
                }
            }

            Text("— or —").foregroundStyle(Color.pomoSubtle)

            VStack(spacing: 8) {
                Text("Have a code?").font(.caption.bold()).foregroundStyle(Color.pomoSubtle)
                TextField("ENTER CODE", text: $codeField)
                    .textInputAutocapitalization(.characters).autocorrectionDisabled()
                    .multilineTextAlignment(.center)
                    .font(.system(.title3, design: .monospaced))
                    .textFieldStyle(.roundedBorder)
                Button { Task { await partner.accept(code: codeField, auth: auth); codeField = "" } } label: {
                    Text("Link up").font(.headline).foregroundStyle(Color.pomoTomato)
                        .frame(maxWidth: .infinity).padding()
                        .background(RoundedRectangle(cornerRadius: 14).stroke(Color.pomoTomato, lineWidth: 2))
                }
            }
            .pomoCard(padding: 18, radius: 16)

            if let err = partner.errorText {
                Text(err).font(.footnote).foregroundStyle(.red)
            }
        }
    }
}
