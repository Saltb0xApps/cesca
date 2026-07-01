import Foundation

@MainActor
final class PartnerStore: ObservableObject {
    @Published var summary: Supabase.PartnerSummary?
    @Published var loading = false
    @Published var errorText: String?
    @Published var lostBanner = false

    func refresh(auth: Auth) async {
        guard Secrets.isConfigured, let s = auth.session else { return }
        loading = true
        defer { loading = false }
        do { summary = try await Supabase.shared.partnerSummary(session: s) }
        catch { errorText = friendly(error) }
    }

    /// Create (or fetch) my invite code, then refresh.
    @discardableResult
    func createInvite(auth: Auth) async -> String? {
        guard Secrets.isConfigured, let s = auth.session else { return nil }
        do {
            let code = try await Supabase.shared.createPartnerInvite(session: s)
            await refresh(auth: auth)
            return code
        } catch {
            errorText = friendly(error)
            return nil
        }
    }

    func accept(code: String, auth: Auth) async {
        let trimmed = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard Secrets.isConfigured, let s = auth.session, !trimmed.isEmpty else { return }
        do {
            try await Supabase.shared.acceptPartnerInvite(trimmed, session: s)
            errorText = nil
            await refresh(auth: auth)
        } catch {
            errorText = friendly(error)
        }
    }

    /// Settle finished days (mutual-loss check), surfacing a banner on a loss.
    func settle(auth: Auth) async {
        guard Secrets.isConfigured, let s = auth.session else { return }
        do {
            if let r = try await Supabase.shared.settlePartnerDays(session: s), r.lost {
                lostBanner = true
            }
            await refresh(auth: auth)
        } catch { /* non-fatal */ }
    }

    private func friendly(_ e: Error) -> String {
        let s = "\(e)".lowercased()
        if s.contains("invalid code") { return "That code didn't match anyone." }
        if s.contains("already partnered") { return "You're already linked to a partner." }
        if s.contains("yourself") { return "You can't partner with yourself." }
        return "Something went wrong — try again."
    }
}
