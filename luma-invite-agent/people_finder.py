"""People discovery and email enrichment via the Apollo.io API.

Optional — the agent works without it (Luma-only mode). Set APOLLO_API_KEY to
enable finding people (e.g. "physical AI folks in SF") and their emails.
Email enrichment consumes Apollo credits (1-9 per person revealed).
"""

import os

import requests

BASE_URL = "https://api.apollo.io/api/v1"


class ApolloError(Exception):
    """Raised when the Apollo API returns an error response or no key is set."""


class ApolloClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("APOLLO_API_KEY")
        if not self.api_key:
            raise ApolloError(
                "No Apollo API key found. Set the APOLLO_API_KEY environment variable "
                "(get one at app.apollo.io -> Settings -> Integrations -> API) to enable "
                "people search and email enrichment."
            )
        self.session = requests.Session()
        self.session.headers.update({
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
        })

    def _post(self, path: str, body: dict) -> dict:
        resp = self.session.post(f"{BASE_URL}{path}", json=body, timeout=30)
        if resp.status_code >= 400:
            raise ApolloError(f"Apollo API {resp.status_code} on {path}: {resp.text[:500]}")
        return resp.json()

    def search_people(self, keywords: str | None = None, titles: list[str] | None = None,
                      locations: list[str] | None = None, page: int = 1, per_page: int = 25) -> dict:
        body = {k: v for k, v in {
            "q_keywords": keywords,
            "person_titles": titles,
            "person_locations": locations,
            "page": page,
            "per_page": per_page,
        }.items() if v}
        # Newer accounts use /mixed_people/api_search; older master keys use /mixed_people/search.
        try:
            raw = self._post("/mixed_people/api_search", body)
        except ApolloError as e:
            if "403" in str(e) or "404" in str(e):
                raw = self._post("/mixed_people/search", body)
            else:
                raise

        people = []
        for p in raw.get("people", []) + raw.get("contacts", []):
            people.append({
                "name": p.get("name"),
                "title": p.get("title"),
                "organization": (p.get("organization") or {}).get("name") or p.get("organization_name"),
                "location": ", ".join(x for x in [p.get("city"), p.get("state")] if x),
                "linkedin_url": p.get("linkedin_url"),
                "apollo_id": p.get("id"),
            })
        pagination = raw.get("pagination", {})
        return {
            "people": people,
            "page": pagination.get("page"),
            "total_pages": pagination.get("total_pages"),
            "total_entries": pagination.get("total_entries"),
            "note": "This endpoint does not return emails. Use find_email per person to reveal one.",
        }

    def enrich_person(self, name: str | None = None, organization_name: str | None = None,
                      domain: str | None = None, linkedin_url: str | None = None) -> dict:
        body = {k: v for k, v in {
            "name": name,
            "organization_name": organization_name,
            "domain": domain,
            "linkedin_url": linkedin_url,
            "reveal_personal_emails": False,  # work emails only; flip deliberately if ever needed
        }.items() if v is not None}
        raw = self._post("/people/match", body)
        person = raw.get("person") or {}
        if not person:
            return {"found": False, "note": "No match. Try adding the employer domain or LinkedIn URL."}
        email = person.get("email")
        return {
            "found": True,
            "name": person.get("name"),
            "title": person.get("title"),
            "organization": (person.get("organization") or {}).get("name"),
            "email": None if (email or "").startswith("email_not_unlocked") else email,
            "email_status": person.get("email_status"),
            "linkedin_url": person.get("linkedin_url"),
        }
