import SwiftUI

@main
struct PomoLeagueApp: App {
    init() { FontLoader.registerAll() }
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
            } else {
                MainTabView()
            }
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject var appState: AppState

    init() {
        // Sketch-style tab bar: white bg, red top border
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = .white
        appearance.shadowColor = UIColor(Color.pomoRed)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }

    var body: some View {
        TabView {
            HomeView()    .tabItem { Label("home",    systemImage: "house.fill") }
            PartnerView() .tabItem { Label("partner", systemImage: "person.2.fill") }
            LeagueView()  .tabItem { Label("league",  systemImage: "trophy.fill") }
            StatsView()   .tabItem { Label("stats",   systemImage: "chart.bar.fill") }
            ProfileView() .tabItem { Label("profile", systemImage: "person.fill") }
        }
        .tint(Color.pomoRed)
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
