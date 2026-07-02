import SwiftUI

struct PartnerView: View {
    @EnvironmentObject var partner: PartnerStore
    @EnvironmentObject var auth: Auth
    @State private var codeField = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("partner.")
                        .font(.marker(32))
                        .foregroundStyle(Color.pomoRed)
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 52)
                .padding(.bottom, 20)

                VStack(spacing: 14) {
                    // Banner: lost streak
                    if partner.lostBanner {
                        HStack(spacing: 12) {
                            Text("💔")
                                .font(.system(size: 26))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("team streak lost")
                                    .font(.caveatBold(18))
                                    .foregroundStyle(.white)
                                Text("someone missed their goal yesterday.")
                                    .font(.caveat(15))
                                    .foregroundStyle(Color.white.opacity(0.8))
                            }
                            Spacer()
                        }
                        .padding(14)
                        .background(RoundedRectangle(cornerRadius: 4).fill(Color.pomoRed))
                    }

                    if !Secrets.isConfigured || auth.session == nil {
                        notSignedIn
                    } else if let s = partner.summary, s.active {
                        partneredView(s)
                    } else {
                        inviteView(pendingCode: partner.summary?.invite_code)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 100)
            }
        }
        .background(Color.pomoBg.ignoresSafeArea())
        .task { await partner.settle(auth: auth) }
        .refreshable { await partner.refresh(auth: auth) }
    }

    // MARK: - Not signed in

    private var notSignedIn: some View {
        VStack(spacing: 12) {
            Text("🤝")
                .font(.system(size: 48))
                .padding(.top, 32)
            Text("sign in to link up with a partner and share a study streak.")
                .font(.caveat(17))
                .foregroundStyle(Color.pomoRedFaded)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 24)
    }

    // MARK: - Partnered

    private func partneredView(_ s: Supabase.PartnerSummary) -> some View {
        VStack(spacing: 14) {
            // Streak
            VStack(spacing: 4) {
                HStack(spacing: 8) {
                    Text("🔥").font(.system(size: 30))
                    Text("\(s.team_streak)")
                        .font(.marker(64))
                        .foregroundStyle(Color.pomoRed)
                }
                Text("day team streak with \(s.partner_name ?? "your partner")")
                    .font(.caveat(16))
                    .foregroundStyle(Color.pomoRedFaded)
            }
            .frame(maxWidth: .infinity)
            .sketchCard()

            progressRow(name: "you", avatar: "🍅", today: s.you_today, goal: s.you_goal)
            progressRow(name: s.partner_name ?? "partner", avatar: s.partner_avatar ?? "🙂",
                        today: s.partner_today ?? 0, goal: s.partner_goal ?? 0)

            Text("if either of you misses today's goal, the streak resets. don't be the reason.")
                .font(.caveat(14))
                .foregroundStyle(Color.pomoRedFaded)
                .multilineTextAlignment(.center)
        }
    }

    private func progressRow(name: String, avatar: String, today: Int, goal: Int) -> some View {
        let pct = goal > 0 ? min(1.0, Double(today) / Double(goal)) : 0.0
        let hit = goal > 0 && today >= goal

        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(avatar).font(.system(size: 18))
                Text(name)
                    .font(.caveatBold(18))
                    .foregroundStyle(Color.pomoRed)
                Spacer()
                Text("\(today) / \(goal)\(hit ? " ✓" : "")")
                    .font(.caveatBold(18))
                    .foregroundStyle(hit ? Color(red: 0.18, green: 0.62, blue: 0.36) : Color.pomoRed)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2).fill(Color.pomoRed.opacity(0.12))
                    RoundedRectangle(cornerRadius: 2).fill(hit ? Color(red: 0.18, green: 0.62, blue: 0.36) : Color.pomoRed)
                        .frame(width: geo.size.width * pct)
                        .animation(.easeOut, value: pct)
                }
            }
            .frame(height: 8)
        }
        .sketchCard()
    }

    // MARK: - Invite

    private func inviteView(pendingCode: String?) -> some View {
        VStack(spacing: 14) {
            // Explainer
            VStack(spacing: 6) {
                Text("study with a partner.")
                    .font(.marker(26))
                    .foregroundStyle(Color.pomoRed)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("link up with one person. hit your daily goal together and your team streak grows. miss it and you both reset.")
                    .font(.caveat(16))
                    .foregroundStyle(Color.pomoRedFaded)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .sketchCard()

            if let code = pendingCode {
                // Show pending code
                VStack(spacing: 8) {
                    SketchLabel("your invite code")
                    Text(code)
                        .font(.marker(38))
                        .foregroundStyle(Color.pomoRed)
                        .tracking(4)
                    ShareLink(item: "Be my focus partner on PomoLeague — enter code \(code)") {
                        Text("share code →")
                            .font(.caveatBold(20))
                            .foregroundStyle(Color.pomoRed)
                    }
                }
                .frame(maxWidth: .infinity)
                .sketchCard()
            } else {
                Button { Task { await partner.createInvite(auth: auth) } } label: {
                    Text("create my invite code →")
                        .font(.caveatBold(22))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(RoundedRectangle(cornerRadius: 4).fill(Color.pomoRed))
                }
            }

            // Divider
            HStack {
                Rectangle().fill(Color.pomoRed.opacity(0.2)).frame(height: 1)
                Text("or")
                    .font(.caveat(14))
                    .foregroundStyle(Color.pomoRedFaded)
                    .padding(.horizontal, 8)
                Rectangle().fill(Color.pomoRed.opacity(0.2)).frame(height: 1)
            }

            // Enter code
            VStack(spacing: 12) {
                SketchLabel("have a code?")
                    .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: 6) {
                    TextField("", text: $codeField, prompt:
                        Text("ENTER CODE")
                            .font(.caveatBold(22))
                            .foregroundStyle(Color.pomoRed.opacity(0.35))
                    )
                    .font(.caveatBold(22))
                    .foregroundStyle(Color.pomoRed)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .multilineTextAlignment(.center)
                    .padding(.bottom, 8)

                    Rectangle().fill(Color.pomoRed).frame(height: 2)
                }

                Button {
                    Task { await partner.accept(code: codeField, auth: auth); codeField = "" }
                } label: {
                    Text("link up →")
                        .font(.caveatBold(22))
                        .foregroundStyle(Color.pomoRed)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(Color.pomoRed, lineWidth: 1.5))
                }
            }
            .sketchCard()

            if let err = partner.errorText {
                Text(err)
                    .font(.caveat(15))
                    .foregroundStyle(.red)
            }
        }
    }
}
