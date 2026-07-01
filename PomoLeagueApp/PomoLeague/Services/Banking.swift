import Foundation

/// Banks a completed pomo: always to the local ledger; also to Supabase when
/// signed in (updating the real league). Server calls refresh the session on a
/// 401 and surface failures via AppState.
@MainActor
enum Banking {
    static func bankPomo(ledger: Ledger, auth: Auth, chainIndex: Int, task: String?) {
        ledger.bankLocal(chainIndex: chainIndex, task: task)
        guard Secrets.isConfigured, auth.session != nil else { return }
        Task {
            do {
                try await auth.withValidSession { s in
                    _ = try await Supabase.shared.rpc(
                        "bank_pomo",
                        params: ["p_task": task ?? NSNull(), "p_chain_index": chainIndex],
                        session: s
                    )
                }
            } catch {
                AppState.shared.show("Couldn't sync your pomo — check your connection.")
                print("[bank_pomo] failed: \(error)")
            }
        }
    }

    /// Server half of the phone penalty: delete today's rounds + reset streak.
    static func applyPenalty(auth: Auth) {
        guard Secrets.isConfigured, auth.session != nil else { return }
        Task {
            do { try await auth.withValidSession { s in
                _ = try await Supabase.shared.rpc("apply_penalty", params: [:], session: s)
            } } catch { print("[apply_penalty] failed: \(error)") }
        }
    }

    /// Sync the daily goal to the server (used by the partner evaluation).
    static func setDailyGoal(auth: Auth, goal: Int) {
        guard Secrets.isConfigured, auth.session != nil else { return }
        Task {
            do { try await auth.withValidSession { s in
                _ = try await Supabase.shared.rpc("set_daily_goal", params: ["g": goal], session: s)
            } } catch { print("[set_daily_goal] failed: \(error)") }
        }
    }
}
