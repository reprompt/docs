#!/usr/bin/env python3
"""
Script to fetch OpenAPI specs for all organizations listed in orgs.json
"""

import asyncio
import json
import os
import sys
import aiohttp
from pathlib import Path
from tqdm.asyncio import tqdm_asyncio

# Configuration
BASE_URL = "https://reprompt--reprompt-fastapi-fastapi-app-dev.us-west.modal.run"
ORGS_JSON_PATH = "scripts/orgs.json"
OUTPUT_DIR = "orgs"

# SQL query to generate orgs.json if it doesn't exist
SQL_QUERY = """-- Return one key per unique org slug
SELECT 
  b."orgSlug",
  MIN(a."key") AS key  -- or MAX(a."key") if you prefer
FROM "ApiKey" a
JOIN "Organization" b
  ON a."organizationId" = b.id
GROUP BY b."orgSlug"
ORDER BY b."orgSlug";"""


def to_kebab_case(text):
    """Convert text to kebab-case"""
    return text.lower().replace("_", "-").replace(" ", "-")


async def fetch_openapi_for_org(session, semaphore, org_slug, api_key, is_public=False):
    """Fetch OpenAPI spec for a single organization"""
    if is_public:
        # Special case: public OpenAPI spec (no org slug)
        url = f"{BASE_URL}/openapi.json"
    else:
        url = f"{BASE_URL}/{org_slug}/openapi.json?apiKey={api_key}"
    
    async with semaphore:
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                response.raise_for_status()
                data = await response.json()
                return org_slug, data, None
        except Exception as e:
            return org_slug, None, str(e)


async def main():
    # Check if orgs.json exists
    if not os.path.exists(ORGS_JSON_PATH):
        print(f"❌ {ORGS_JSON_PATH} not found!")
        print("\nPlease run the following SQL query to generate the data:\n")
        print(SQL_QUERY)
        sys.exit(1)
    
    # Read orgs.json
    try:
        with open(ORGS_JSON_PATH, 'r') as f:
            orgs = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing {ORGS_JSON_PATH}: {e}")
        sys.exit(1)
    
    # Create output directory if it doesn't exist
    Path(OUTPUT_DIR).mkdir(exist_ok=True)
    
    # Filter valid orgs
    valid_orgs = [
        org for org in orgs 
        if org.get("orgSlug") and org.get("key")
    ]
    
    total = len(valid_orgs) + 1  # +1 for public OpenAPI
    print(f"\n🚀 Fetching OpenAPI specs for {total} endpoints ({len(valid_orgs)} orgs + public) (10 concurrent requests)...\n")
    
    # Create semaphore with limit of 10
    semaphore = asyncio.Semaphore(10)
    
    # Create async session and fetch all
    async with aiohttp.ClientSession() as session:
        tasks = [
            fetch_openapi_for_org(session, semaphore, org["orgSlug"], org["key"])
            for org in valid_orgs
        ]
        
        # Add special case for public OpenAPI (no org slug, no API key)
        tasks.append(
            fetch_openapi_for_org(session, semaphore, "public", None, is_public=True)
        )
        
        # Use tqdm_asyncio.gather for progress bar
        results = await tqdm_asyncio.gather(*tasks, desc="Fetching OpenAPI specs")
    
    # Process results and save files
    success_count = 0
    for org_slug, openapi_data, error in results:
        if error:
            print(f"❌ Error fetching {org_slug}: {error}")
            continue
        
        if openapi_data:
            # Save to file (UPSERT - overwrite if exists)
            kebab_slug = to_kebab_case(org_slug)
            output_file = os.path.join(OUTPUT_DIR, f"openapi-{kebab_slug}.json")
            
            try:
                with open(output_file, 'w') as f:
                    json.dump(openapi_data, f, indent=2)
                success_count += 1
            except IOError as e:
                print(f"❌ Error writing {output_file}: {e}")
    
    print(f"\n✨ Complete! Successfully fetched {success_count}/{total} OpenAPI specs.")
    print(f"📁 Files saved to: {OUTPUT_DIR}/")


if __name__ == "__main__":
    asyncio.run(main())

