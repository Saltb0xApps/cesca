import SwiftUI

@main
struct PomoLeagueApp: App {
    @StateObject private var auth = Auth()
    @StateObject private var ledger = Ledger()
    @StateObject private var profile = ProfileStore()
    @StateObject private var tasks = TaskStore()
    @StateObject private var partner = PartnerStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(ledger)
                .environmentObject(profile)
                .environmentObject(tasks)
                .environmentObject(partner)
                .environmentObject(AppState.shared)
                .tint(.pomoTomato)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var auth: Auth
    @EnvironmentObject var profile: ProfileStore

    var body: some View {
        Group {
            if !profile.seenIntro {
                OnboardingCarouselView()
            } else if !auth.isAuthed {
                SignInView()
            } else if profile.displayName.isEmpty {
                OnboardingView()
            } else if !profile.hasPickedGoal {
                GoalPickerView()
            } else {
                MainTabView()
            }
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        TabView {
            HomeView().tabItem { Label("Home", systemImage: "house.fill") }
            PartnerView().tabItem { Label("Partner", systemImage: "person.2.fill") }
            LeagueView().tabItem { Label("League", systemImage: "trophy.fill") }
            StatsView().tabItem { Label("Stats", systemImage: "chart.bar.fill") }
            ProfileView().tabItem { Label("Profile", systemImage: "person.fill") }
        }
        .overlay(alignment: .top) {
            if let msg = appState.errorMessage {
                ErrorBanner(message: msg) { appState.clear() }
                    .task {
                        try? await Task.sleep(nanoseconds: 4_000_000_000)
                        appState.clear()
                    }
            }
        }
    }
}

struct ErrorBanner: View {
    let message: String
    let onClose: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Text(message).font(.footnote.bold()).foregroundStyle(.white)
            Spacer()
            Button(action: onClose) { Image(systemName: "xmark").foregroundStyle(.white) }
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .background(RoundedRectangle(cornerRadius: 12).fill(Color.pomoTomatoDark))
        .padding(.horizontal, 12)
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}
