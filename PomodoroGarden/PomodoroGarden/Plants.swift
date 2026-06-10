import SwiftUI

// MARK: - Plant types

enum PlantType: String, CaseIterable, Identifiable, Codable {
    case tomato, strawberry, carrot, eggplant, corn, sunflower

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .tomato:     return "Tomato"
        case .strawberry: return "Strawberry"
        case .carrot:     return "Carrot"
        case .eggplant:   return "Eggplant"
        case .corn:       return "Corn"
        case .sunflower:  return "Sunflower"
        }
    }

    var emoji: String {
        switch self {
        case .tomato:     return "🍅"
        case .strawberry: return "🍓"
        case .carrot:     return "🥕"
        case .eggplant:   return "🍆"
        case .corn:       return "🌽"
        case .sunflower:  return "🌻"
        }
    }

    var accent: Color {
        switch self {
        case .tomato:     return Color(red: 0.90, green: 0.25, blue: 0.22)
        case .strawberry: return Color(red: 0.93, green: 0.30, blue: 0.40)
        case .carrot:     return Color(red: 0.95, green: 0.55, blue: 0.16)
        case .eggplant:   return Color(red: 0.56, green: 0.26, blue: 0.66)
        case .corn:       return Color(red: 0.98, green: 0.82, blue: 0.22)
        case .sunflower:  return Color(red: 0.98, green: 0.78, blue: 0.18)
        }
    }

    var matureSprite: PixelSprite { Sprites.mature(for: self) }
}

// MARK: - Growth stages

enum GrowthStage {
    case seed, sprout, growing, mature

    static func stage(for progress: Double) -> GrowthStage {
        switch progress {
        case ..<0.08: return .seed
        case ..<0.35: return .sprout
        case ..<1.0:  return .growing
        default:      return .mature
        }
    }
}

func sprite(for plant: PlantType, stage: GrowthStage) -> PixelSprite {
    switch stage {
    case .seed:               return Sprites.seed
    case .sprout:             return Sprites.sprout
    case .growing, .mature:   return plant.matureSprite
    }
}

// MARK: - Persisted garden item

struct PlantedPlant: Codable, Identifiable {
    let id: UUID
    let typeID: String
    let plantedAt: Date

    var type: PlantType { PlantType(rawValue: typeID) ?? .tomato }
}

// MARK: - Storage

struct GardenStore {
    private let key = "pixelgarden.plants.v1"

    func load() -> [PlantedPlant] {
        guard let data = UserDefaults.standard.data(forKey: key),
              let items = try? JSONDecoder().decode([PlantedPlant].self, from: data)
        else { return [] }
        return items
    }

    func save(_ items: [PlantedPlant]) {
        guard let data = try? JSONEncoder().encode(items) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}

// MARK: - Sprite library
// Hand-drawn pixel art. '.' is transparent; other characters map to Palette.

enum Sprites {
    static let seed = PixelSprite(rows: [
        "............",
        "............",
        "............",
        "............",
        "............",
        "............",
        ".....kk.....",
        "....kBBk....",
        ".....kk.....",
        "..dddddddd..",
        ".dddddddddd.",
        "dddddddddddd",
    ])

    static let sprout = PixelSprite(rows: [
        "............",
        "............",
        "............",
        "....g..g....",
        "...gGgGGg...",
        "....gsg.....",
        ".....s......",
        ".....s......",
        "..dddddddd..",
        ".dddddddddd.",
        "dddddddddddd",
    ])

    static let rotten = PixelSprite(rows: [
        "............",
        "....k..k....",
        "...kBkkBk...",
        "..kBbXXbBk..",
        "..kbBbbBbk..",
        "..kBbXXbBk..",
        "..kbBbbBbk..",
        "..kBbbbbBk..",
        "...kBBBBk...",
        "..dddddddd..",
        ".dddddddddd.",
        "dddddddddddd",
    ])

    static func mature(for plant: PlantType) -> PixelSprite {
        switch plant {
        case .tomato:
            return PixelSprite(rows: [
                "....G.G.....",
                "...GGgGG....",
                ".....k......",
                "...kkrrkk...",
                "..krrrrrrk..",
                ".krrrrrrrrk.",
                ".krrrwwrrrk.",
                ".krrrrrrrrk.",
                ".krrRRRRrrk.",
                "..krrrrrrk..",
                "...kkrrkk...",
                "....kkkk....",
            ])
        case .strawberry:
            return PixelSprite(rows: [
                "...gg..gg...",
                "..gGgggGg...",
                ".....k......",
                "...kkrrkk...",
                "..krwrwrrk..",
                ".krrwrrwrrk.",
                ".krwrrwrrwk.",
                ".krrwrrwrrk.",
                "..krwrrwrk..",
                "...krrrrk...",
                "....krrk....",
                ".....kk.....",
            ])
        case .carrot:
            return PixelSprite(rows: [
                "....g.g.g...",
                "...gGgGgG...",
                "....gGg.....",
                ".....k......",
                "...kooook...",
                "...kooook...",
                "...koook....",
                "....kook....",
                "....kook....",
                ".....kk.....",
                ".....k......",
                "............",
            ])
        case .eggplant:
            return PixelSprite(rows: [
                "....g.g.....",
                "...gGgGg....",
                ".....s......",
                "...kpppk....",
                "..kpppppk...",
                ".kpppPpppk..",
                ".kpppppppk..",
                ".kppPppppk..",
                ".kpppppppk..",
                "..kpppppk...",
                "...kpppk....",
                "....kkk.....",
            ])
        case .corn:
            return PixelSprite(rows: [
                "....G.......",
                "...GgG......",
                "..kGyyGk....",
                ".kGyYyyGk...",
                ".kyyYyYGk...",
                ".kGyyyyyk...",
                ".kyYyyYGk...",
                ".kGyyyyyk...",
                ".kyyYyYGk...",
                "..kGyyGk....",
                "...GgG......",
                "....G.......",
            ])
        case .sunflower:
            return PixelSprite(rows: [
                "...kykyk....",
                "..kyyoyyk...",
                ".kyoBBBoyk..",
                ".kyoBBBBoyk.",
                ".kyoBBBoyk..",
                "..kyyoyyk...",
                "...kykyk....",
                ".....s......",
                "...g.s.g....",
                "..gGgsgGg...",
                ".....s......",
                "....g.g.....",
            ])
        }
    }
}
