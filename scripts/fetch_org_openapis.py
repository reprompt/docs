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
DOCS_JSON_PATH = "docs.json"

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


def to_title_case(slug):
    """Convert kebab-case or snake_case slug to Title Case"""
    # Replace hyphens and underscores with spaces, then title case
    return slug.replace("-", " ").replace("_", " ").title()


def update_docs_json(successful_org_slugs):
    """Update docs.json with API reference groups for all successful orgs"""
    try:
        # Read existing docs.json
        with open(DOCS_JSON_PATH, 'r') as f:
            docs_config = json.load(f)
        
        # Find version 1.0.0 in navigation.versions
        versions = docs_config.get("navigation", {}).get("versions", [])
        v1_index = None
        for i, version in enumerate(versions):
            if version.get("version") == "1.0.0":
                v1_index = i
                break
        
        if v1_index is None:
            print("⚠️  Warning: Version 1.0.0 not found in docs.json")
            return
        
        # Build new groups array
        new_groups = []
        
        # Add API Reference group for each successful org (sorted alphabetically)
        for org_slug in sorted(successful_org_slugs):
            kebab_slug = to_kebab_case(org_slug)
            title = to_title_case(org_slug)
            new_groups.append({
                "group": f"API Reference - {title}",
                "openapi": f"orgs/openapi-{kebab_slug}.json"
            })
        
        # Preserve existing non-API-Reference groups (like Guides)
        existing_groups = versions[v1_index].get("groups", [])
        for group in existing_groups:
            group_name = group.get("group", "")
            if not group_name.startswith("API Reference"):
                new_groups.append(group)
        
        # Update the groups
        versions[v1_index]["groups"] = new_groups
        
        # Write back to docs.json
        with open(DOCS_JSON_PATH, 'w') as f:
            json.dump(docs_config, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Updated {DOCS_JSON_PATH} with {len(successful_org_slugs)} API reference groups")
        
    except Exception as e:
        print(f"⚠️  Warning: Failed to update {DOCS_JSON_PATH}: {e}")


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
    successful_org_slugs = []
    
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
                    json.dump(openapi_data, f, indent=2, separators=(', ', ': '), ensure_ascii=False)
                success_count += 1
                
                # Track successful orgs (exclude "public" as it goes to v2)
                if org_slug != "public":
                    successful_org_slugs.append(org_slug)
            except IOError as e:
                print(f"❌ Error writing {output_file}: {e}")
    
    print(f"\n✨ Complete! Successfully fetched {success_count}/{total} OpenAPI specs.")
    print(f"📁 Files saved to: {OUTPUT_DIR}/")
    
    # Update docs.json with the new API reference groups
    if successful_org_slugs:
        print(f"\n📝 Updating {DOCS_JSON_PATH}...")
        update_docs_json(successful_org_slugs)


if __name__ == "__main__":
    asyncio.run(main())

