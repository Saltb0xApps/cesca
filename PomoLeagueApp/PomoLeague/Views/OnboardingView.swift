import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var auth: Auth
    @EnvironmentObject var profile: ProfileStore

    @State private var name = ""
    @State private var avatar = "🍅"
    @State private var examTag = ""

    private let avatars = ["🍅", "🔥", "📚", "🧠", "⚡️", "🦉", "🌙", "☕️", "🎯", "🏆"]
    private let suggestions = ["USMLE", "Bar Exam", "A-Levels", "Finals", "Thesis"]

    var canContinue: Bool { name.trimmingCharacters(in: .whitespaces).count >= 2 }

    var body: some View {
        ZStack {
            Color(red: 0.980, green: 0.969, blue: 0.957).ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    Text("who are\nyou?")
                        .font(.marker(40))
                        .foregroundStyle(Color.pomoRed)
                        .lineSpacing(4)
                        .padding(.top, 68)
                        .padding(.bottom, 8)

                    Text("set up your fighter profile.")
                        .font(.caveat(18))
                        .foregroundStyle(Color.pomoRedFaded)
                        .padding(.bottom, 36)

                    // Name field
                    fieldSection("your name") {
                        VStack(alignment: .leading, spacing: 6) {
                            TextField("", text: $name, prompt:
                                Text("e.g. Akhil, Sara…")
                                    .font(.caveatBold(22))
                                    .foregroundStyle(Color.pomoRed.opacity(0.35))
                            )
                            .font(.caveatBold(22))
                            .foregroundStyle(Color.pomoRed)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                            .padding(.bottom, 8)

                            Rectangle()
                                .fill(Color.pomoRed)
                                .frame(height: 2)
                        }
                    }
                    .padding(.bottom, 28)

                    // Avatar picker
                    fieldSection("pick your avatar") {
                        LazyVGrid(
                            columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 5),
                            spacing: 10
                        ) {
                            ForEach(avatars, id: \.self) { a in
                                Button { avatar = a } label: {
                                    Text(a)
                                        .font(.system(size: 28))
                                        .frame(width: 52, height: 52)
                                        .background(
                                            RoundedRectangle(cornerRadius: 4)
                                                .fill(avatar == a ? Color.pomoRed.opacity(0.1) : Color.white)
                                                .overlay(RoundedRectangle(cornerRadius: 4)
                                                    .stroke(Color.pomoRed, lineWidth: avatar == a ? 2 : 1))
                                        )
                                }
                            }
                        }
                    }
                    .padding(.bottom, 28)

                    // Exam tag
                    fieldSection("what are you grinding for?") {
                        VStack(alignment: .leading, spacing: 12) {
                            VStack(alignment: .leading, spacing: 6) {
                                TextField("", text: $examTag, prompt:
                                    Text("USMLE Step 1, Finals, Thesis…")
                                        .font(.caveat(18))
                                        .foregroundStyle(Color.pomoRed.opacity(0.35))
                                )
                                .font(.caveat(18))
                                .foregroundStyle(Color.pomoRed)
                                .autocorrectionDisabled()
                                .padding(.bottom, 6)

                                Rectangle()
                                    .fill(Color.pomoRed.opacity(0.4))
                                    .frame(height: 1)
                            }

                            // Quick-pick chips
                            LazyVGrid(
                                columns: [GridItem(.adaptive(minimum: 90), spacing: 8)],
                                alignment: .leading, spacing: 8
                            ) {
                                ForEach(suggestions, id: \.self) { s in
                                    Button { examTag = s } label: {
                                        Text(s)
                                            .font(.caveatBold(15))
                                            .foregroundStyle(examTag == s ? .white : Color.pomoRed)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 7)
                                            .background(
                                                RoundedRectangle(cornerRadius: 4)
                                                    .fill(examTag == s ? Color.pomoRed : Color.clear)
                                                    .overlay(RoundedRectangle(cornerRadius: 4)
                                                        .stroke(Color.pomoRed, lineWidth: 1.5))
                                            )
                                    }
                                }
                            }
                        }
                    }
                    .padding(.bottom, 40)

                    // CTA
                    Button(action: save) {
                        Text("start competing →")
                            .font(.caveatBold(24))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 20)
                            .background(
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(canContinue ? Color.pomoRed : Color.pomoRed.opacity(0.35))
                            )
                    }
                    .disabled(!canContinue)
                    .padding(.bottom, 40)
                }
                .padding(.horizontal, 24)
            }
        }
    }

    private func fieldSection<Content: View>(_ label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(label.uppercased())
                .font(.caveatBold(13))
                .foregroundStyle(Color.pomoRedFaded)
                .tracking(1.2)
            content()
        }
    }

    private func save() {
        profile.displayName = name.trimmingCharacters(in: .whitespaces)
        profile.avatar = avatar
        profile.examTag = examTag.trimmingCharacters(in: .whitespaces)
        profile.save()

        if Secrets.isConfigured, auth.session != nil {
            let name = profile.displayName, avatar = profile.avatar
            let tag = profile.examTag.isEmpty ? nil : profile.examTag
            Task {
                try? await auth.withValidSession { s in
                    try await Supabase.shared.upsertProfile(
                        session: s, displayName: name, avatar: avatar, examTag: tag)
                }
            }
        }
    }
}

// Legacy — keep for anything still referencing it
struct FlowChips: View {
    let items: [String]
    let onTap: (String) -> Void

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(items, id: \.self) { item in
                Button { onTap(item) } label: {
                    Text(item)
                        .font(.caveatBold(15))
                        .foregroundStyle(Color.pomoRed)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .overlay(Capsule().stroke(Color.pomoRed, lineWidth: 1.5))
                }
            }
        }
    }
}
