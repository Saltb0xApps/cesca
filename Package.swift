// swift-tools-version:5.7
import PackageDescription

let package = Package(
    name: "Cesca",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "Cesca",
            resources: [.process("Resources")]
        )
    ]
)
