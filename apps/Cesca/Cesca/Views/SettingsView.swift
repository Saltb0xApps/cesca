import SwiftUI
import SwiftData

struct SettingsView: View {
    @Environment(\.modelContext) private var context
    @Query private var settingsList: [AppSettings]

    var body: some View {
        Form {
            let bound = binding()

            Section("Notion") {
                SecureField("Integration token (secret_…)", text: bound.notionToken)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField("Target page id", text: bound.notionPageId)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Text("Create an integration at notion.so/my-integrations and share your destination page with it.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Handwriting") {
                Picker("Recognition language", selection: bound.recognitionLanguage) {
                    ForEach(supportedLanguages, id: \.self) { code in
                        Text(Locale.current.localizedString(forIdentifier: code) ?? code)
                            .tag(code)
                    }
                }
            }
        }
        .navigationTitle("Settings")
    }

    private var supportedLanguages: [String] {
        // VNRecognizeTextRequest's supported languages depend on the device,
        // but these are widely available.
        ["en-US", "it-IT", "es-ES", "fr-FR", "de-DE", "pt-BR"]
    }

    private func binding() -> Bindable<AppSettings> {
        if let existing = settingsList.first {
            return Bindable(existing)
        }
        let s = AppSettings()
        context.insert(s)
        return Bindable(s)
    }
}
