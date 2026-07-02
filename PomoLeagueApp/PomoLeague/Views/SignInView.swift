import SwiftUI

struct SignInView: View {
    @EnvironmentObject var auth: Auth
    @EnvironmentObject var profile: ProfileStore
    @State private var email = ""
    @State private var code = ""
    @State private var stage: Stage = .email
    @State private var busy = false
    @State private var error: String?

    enum Stage { case email, code }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Tomato icon + brand heading
            VStack(spacing: 12) {
                Text("🍅").font(.system(size: 32))

                Text("circle of\npomodoros")
                    .font(.marker(36))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Color.pomoRed)

                Text("study, scored as a sport.")
                    .font(.caveat(20))
                    .foregroundStyle(Color.pomoRedFaded)
            }
            .padding(.bottom, 48)

            // Form
            VStack(spacing: 14) {
                if stage == .email {
                    emailField

                    sketchBtn("send me a code →", filled: true, busy: busy, action: send)

                    if let error {
                        Text(error).font(.caveat(16)).foregroundStyle(.red)
                    }

                    sketchBtn("explore without account", filled: false, busy: false) {
                        auth.enterDemo()
                    }

                } else {
                    Text("check your inbox at \(email)")
                        .font(.caveat(17))
                        .foregroundStyle(Color.pomoRedFaded)
                        .multilineTextAlignment(.center)
                        .padding(.bottom, 4)

                    codeField

                    sketchBtn("verify →", filled: true, busy: busy, action: verify)

                    if let error {
                        Text(error).font(.caveat(16)).foregroundStyle(.red)
                    }

                    Button("use a different email") { stage = .email }
                        .font(.caveat(16))
                        .foregroundStyle(Color.pomoRedFaded)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.pomoBg.ignoresSafeArea())
    }

    private var emailField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("your email")
                .font(.caveat(13))
                .foregroundStyle(Color.pomoRedFaded)
                .tracking(1)
                .textCase(.uppercase)
            TextField("", text: $email, prompt:
                Text("you@example.com")
                    .font(.caveatBold(20))
                    .foregroundStyle(Color.pomoRed.opacity(0.5))
            )
            .font(.caveatBold(20))
            .foregroundStyle(Color.pomoRed)
            .textInputAutocapitalization(.never)
            .keyboardType(.emailAddress)
            .autocorrectionDisabled()
            .padding(.bottom, 10)
            Divider().background(Color.pomoRed).frame(height: 2)
        }
        .padding(.bottom, 4)
    }

    private var codeField: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("enter code")
                .font(.caveat(13))
                .foregroundStyle(Color.pomoRedFaded)
                .tracking(1)
                .textCase(.uppercase)
            TextField("", text: $code, prompt:
                Text("123456")
                    .font(.caveatBold(20))
                    .foregroundStyle(Color.pomoRed.opacity(0.5))
            )
            .font(.caveatBold(20))
            .foregroundStyle(Color.pomoRed)
            .keyboardType(.numberPad)
            .padding(.bottom, 10)
            Divider().background(Color.pomoRed).frame(height: 2)
        }
        .padding(.bottom, 4)
    }

    @ViewBuilder
    private func sketchBtn(_ title: String, filled: Bool, busy: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            ZStack {
                if busy {
                    ProgressView().tint(filled ? .white : Color.pomoRed)
                } else {
                    Text(title)
                        .font(.caveatBold(22))
                        .foregroundStyle(filled ? .white : Color.pomoRed)
                        .tracking(0.5)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, filled ? 20 : 16)
            .background(
                RoundedRectangle(cornerRadius: 3)
                    .fill(filled ? Color.pomoRed : Color.clear)
                    .overlay(RoundedRectangle(cornerRadius: 3)
                        .stroke(Color.pomoRed, lineWidth: 2))
            )
        }
        .disabled(busy)
    }

    private func send() {
        error = nil; busy = true
        Task {
            do { try await auth.sendOTP(email: email); stage = .code }
            catch { self.error = "couldn't send code — check your email" }
            busy = false
        }
    }

    private func verify() {
        error = nil; busy = true
        Task {
            do {
                try await auth.verifyOTP(email: email, token: code)
                await hydrateProfile()
            } catch { self.error = "invalid code, try again" }
            busy = false
        }
    }

    /// Pull an existing server profile so a returning user skips onboarding.
    private func hydrateProfile() async {
        let fetched = try? await auth.withValidSession { try await Supabase.shared.fetchProfile(session: $0) }
        guard let row = fetched ?? nil, let name = row.display_name, !name.isEmpty else { return }
        profile.displayName = name
        profile.avatar = row.avatar ?? profile.avatar
        profile.examTag = row.exam_tag ?? ""
        if let g = row.daily_goal { profile.dailyGoal = g; profile.hasPickedGoal = true }
        profile.save()
    }
}
