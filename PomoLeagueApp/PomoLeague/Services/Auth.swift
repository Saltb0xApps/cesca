import Foundation

@MainActor
final class Auth: ObservableObject {
    @Published var session: Supabase.Session?
    @Published var demoMode = false

    private let sessionKey = "pomoleague.session.v1"
    private let demoKey = "pomoleague.demoMode.v1"

    var isAuthed: Bool { session != nil || demoMode }
    var isConfigured: Bool { Secrets.isConfigured }

    init() {
        if let data = UserDefaults.standard.data(forKey: sessionKey),
           let s = try? JSONDecoder().decode(Supabase.Session.self, from: data) {
            session = s
        }
        demoMode = UserDefaults.standard.bool(forKey: demoKey)
    }

    func enterDemo() {
        demoMode = true
        UserDefaults.standard.set(true, forKey: demoKey)
    }

    func sendOTP(email: String) async throws {
        try await Supabase.shared.sendOTP(email: email)
    }

    func verifyOTP(email: String, token: String) async throws {
        let s = try await Supabase.shared.verifyOTP(email: email, token: token)
        session = s
        if let data = try? JSONEncoder().encode(s) {
            UserDefaults.standard.set(data, forKey: sessionKey)
        }
    }

    func signOut() {
        session = nil
        demoMode = false
        UserDefaults.standard.removeObject(forKey: sessionKey)
        UserDefaults.standard.removeObject(forKey: demoKey)
    }
}
