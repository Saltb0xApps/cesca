import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var auth: Auth
    @EnvironmentObject var profile: ProfileStore

    @State private var name = ""
    @State private var avatar = "🍅"
    @State private var examTag = ""

    private let avatars = ["🍅", "🔥", "📚", "🧠", "⚡️", "🦉", "🌙", "☕️", "🎯", "🏆"]
    private let suggestions = ["USMLE", "Bar Exam", "A-Levels", "Finals", "Thesis"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Set up your profile").font(.title.bold()).foregroundStyle(Color.pomoInk)

                label("Display name")
                TextField("e.g. Akhil", text: $name).textFieldStyle(.roundedBorder)

                label("Avatar")
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 10) {
                    ForEach(avatars, id: \.self) { a in
                        Text(a).font(.title2)
                            .frame(width: 48, height: 48)
                            .background(Circle().stroke(avatar == a ? Color.pomoTomato : Color.pomoLine, lineWidth: avatar == a ? 2 : 1))
                            .onTapGesture { avatar = a }
                    }
                }

                label("What are you grinding for?")
                TextField("USMLE Step 1, Finals, Thesis…", text: $examTag).textFieldStyle(.roundedBorder)
                FlowChips(items: suggestions) { examTag = $0 }

                Button(action: save) {
                    Text("Start competing").font(.headline).foregroundStyle(.white)
                        .frame(maxWidth: .infinity).padding()
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color.pomoTomato))
                }
                .padding(.top, 12)
                .disabled(name.trimmingCharacters(in: .whitespaces).count < 2)
            }
            .padding(24)
        }
        .background(Color.pomoBg.ignoresSafeArea())
    }

    private func label(_ t: String) -> some View {
        Text(t).font(.subheadline.bold()).foregroundStyle(Color.pomoSubtle).padding(.top, 8)
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

/// Simple wrapping chip row.
struct FlowChips: View {
    let items: [String]
    let onTap: (String) -> Void

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(items, id: \.self) { item in
                Button { onTap(item) } label: {
                    Text(item).font(.subheadline.weight(.semibold)).foregroundStyle(Color.pomoInk)
                        .padding(.horizontal, 14).padding(.vertical, 8)
                        .background(Capsule().stroke(Color.pomoLine))
                }
            }
        }
    }
}
