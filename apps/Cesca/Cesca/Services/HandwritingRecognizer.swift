import Foundation
import Vision
import UIKit

enum HandwritingRecognizer {
    enum RecognizerError: LocalizedError {
        case missingCGImage
        case noText
        var errorDescription: String? {
            switch self {
            case .missingCGImage: "Couldn't get a CGImage from the rendered page."
            case .noText: "Vision didn't find any text."
            }
        }
    }

    static func recognize(image: UIImage, language: String) async throws -> String {
        guard let cg = image.cgImage else { throw RecognizerError.missingCGImage }

        return try await withCheckedThrowingContinuation { cont in
            let request = VNRecognizeTextRequest { request, error in
                if let error {
                    cont.resume(throwing: error); return
                }
                let observations = request.results as? [VNRecognizedTextObservation] ?? []
                let lines = observations.compactMap { $0.topCandidates(1).first?.string }
                let joined = lines.joined(separator: "\n")
                if joined.isEmpty {
                    cont.resume(throwing: RecognizerError.noText)
                } else {
                    cont.resume(returning: joined)
                }
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.recognitionLanguages = [language]

            let handler = VNImageRequestHandler(cgImage: cg, options: [:])
            do {
                try handler.perform([request])
            } catch {
                cont.resume(throwing: error)
            }
        }
    }
}
