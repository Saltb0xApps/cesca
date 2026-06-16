import Foundation

/// Banks a completed pomo: always to the local ledger; also to Supabase when
/// signed in (updating the real league).
@MainActor
enum Banking {
    static func bankPomo(ledger: Ledger, auth: Auth, chainIndex: Int, task: String?) {
        ledger.bankLocal(chainIndex: chainIndex, task: task)

        guard Secrets.isConfigured, let session = auth.session else { return }
        Task {
            do {
                try await Supabase.shared.rpc(
                    "bank_pomo",
                    params: ["p_task": task ?? NSNull(), "p_chain_index": chainIndex],
                    session: session
                )
            } catch {
                print("[bank_pomo] failed: \(error)")
            }
        }
    }
}
