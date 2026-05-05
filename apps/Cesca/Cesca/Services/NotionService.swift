import Foundation

/// Minimal Notion REST client. We only use the two endpoints we need:
/// - `PATCH /v1/blocks/{page_id}/children` to append blocks.
struct NotionService {
    let token: String
    let apiVersion: String = "2022-06-28"

    enum NotionError: LocalizedError {
        case http(status: Int, body: String)
        var errorDescription: String? {
            switch self {
            case .http(let status, let body): "Notion HTTP \(status): \(body)"
            }
        }
    }

    func appendText(header: String, body: String, toPageId pageId: String) async throws {
        let url = URL(string: "https://api.notion.com/v1/blocks/\(pageId)/children")!
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue(apiVersion, forHTTPHeaderField: "Notion-Version")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        var blocks: [[String: Any]] = [
            heading2(header)
        ]
        // Notion rich_text content is capped at 2000 chars per block; chunk it.
        for paragraph in body.split(separator: "\n", omittingEmptySubsequences: false) {
            for chunk in paragraph.chunked(by: 1900) {
                blocks.append(paragraphBlock(String(chunk)))
            }
        }

        let payload: [String: Any] = ["children": blocks]
        req.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            throw NotionError.http(status: http.statusCode, body: String(data: data, encoding: .utf8) ?? "")
        }
    }

    private func heading2(_ text: String) -> [String: Any] {
        [
            "object": "block",
            "type": "heading_2",
            "heading_2": [
                "rich_text": [["type": "text", "text": ["content": text]]]
            ]
        ]
    }

    private func paragraphBlock(_ text: String) -> [String: Any] {
        [
            "object": "block",
            "type": "paragraph",
            "paragraph": [
                "rich_text": [["type": "text", "text": ["content": text]]]
            ]
        ]
    }
}

private extension StringProtocol {
    func chunked(by size: Int) -> [SubSequence] {
        guard !isEmpty else { return [self[startIndex..<startIndex]] }
        var result: [SubSequence] = []
        var i = startIndex
        while i < endIndex {
            let next = index(i, offsetBy: size, limitedBy: endIndex) ?? endIndex
            result.append(self[i..<next])
            i = next
        }
        return result
    }
}
