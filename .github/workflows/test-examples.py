#!/usr/bin/env python3
"""
Test documentation examples by extracting and executing code blocks from MDX files.
"""

import os
import re
import sys
import subprocess
import tempfile
from pathlib import Path
from typing import List, Dict, Tuple

# Environment variables for API credentials
API_KEY = os.getenv('REPROMPT_API_KEY', '')
ORG_SLUG = os.getenv('REPROMPT_ORG_SLUG', '')

# Skip patterns - examples that shouldn't be executed
SKIP_PATTERNS = [
    r'parse.*csv',  # CSV parsing examples
    r'for.*in.*df\.iterrows',  # DataFrame iteration
    r'async\s+def',  # Async function definitions
    r'class\s+\w+',  # Class definitions
    r'waitForBatchCompletion',  # Polling functions
    r'updateDatabase',  # Database operations
    r'\.to_csv',  # File writing operations
    r'fs\.createReadStream',  # File system operations
    r'import.*csv',  # CSV imports
]


def extract_code_blocks(mdx_file: Path) -> List[Dict[str, str]]:
    """Extract code blocks from MDX file."""
    with open(mdx_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match code blocks: ```language label\ncode\n```
    # Handles formats like: ```bash cURL, ```python Python, ```javascript
    pattern = r'```(\w+)(?:\s+\w+)?\n(.*?)```'
    matches = re.finditer(pattern, content, re.DOTALL)

    code_blocks = []
    for match in matches:
        language = match.group(1).lower()
        code = match.group(2).strip()

        # Filter relevant languages
        if language in ['bash', 'curl', 'python', 'javascript', 'js', 'json']:
            # Skip JSON response examples
            if language == 'json':
                continue

            code_blocks.append({
                'language': language,
                'code': code,
                'file': mdx_file.name
            })

    return code_blocks


def should_skip_example(code: str) -> Tuple[bool, str]:
    """Determine if example should be skipped."""
    # Skip pattern/conceptual examples
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, code, re.IGNORECASE):
            return True, f"Skipped (pattern: {pattern})"

    # Skip examples without API calls
    if 'reprompt' not in code.lower() and 'api.reprompt.io' not in code.lower():
        return True, "Skipped (no API call)"

    # Skip response examples (JSON only)
    if code.strip().startswith('{') and code.strip().endswith('}'):
        return True, "Skipped (response example)"

    # Skip if no credentials available
    if not API_KEY or not ORG_SLUG:
        return True, "Skipped (missing API credentials)"

    return False, ""


def substitute_placeholders(code: str) -> str:
    """Replace placeholder values with actual credentials."""
    code = code.replace('{YOUR_API_KEY}', API_KEY)
    code = code.replace('{org_slug}', ORG_SLUG)
    code = code.replace('{your_org_slug}', ORG_SLUG)
    return code


def test_bash_example(code: str) -> Tuple[bool, str]:
    """Execute bash/curl example."""
    code = substitute_placeholders(code)

    # Remove comments and handle multiline curl commands
    code = re.sub(r'#.*$', '', code, flags=re.MULTILINE)
    code = code.replace('\\\n', ' ')  # Join multiline commands

    with tempfile.NamedTemporaryFile(mode='w', suffix='.sh', delete=False) as f:
        f.write('#!/bin/bash\nset -e\n')
        f.write(code)
        script_path = f.name

    try:
        result = subprocess.run(
            ['bash', script_path],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            # Check for HTTP error codes in curl output
            if 'HTTP' in result.stderr and any(code in result.stderr for code in ['400', '401', '403', '404', '500']):
                return False, f"HTTP error in response: {result.stderr[:200]}"
            return True, "Success"
        else:
            return False, f"Exit code {result.returncode}: {result.stderr[:200]}"
    except subprocess.TimeoutExpired:
        return False, "Timeout (>30s)"
    except Exception as e:
        return False, f"Error: {str(e)[:200]}"
    finally:
        os.unlink(script_path)


def test_python_example(code: str) -> Tuple[bool, str]:
    """Execute Python example."""
    code = substitute_placeholders(code)

    # Add imports if missing
    if 'import requests' not in code and 'requests.' in code:
        code = 'import requests\n' + code
    if 'import pandas' not in code and 'pd.' in code:
        code = 'import pandas as pd\n' + code

    # Remove print statements to avoid clutter
    code = re.sub(r'print\(.*?\)', '# print removed', code)

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        script_path = f.name

    try:
        result = subprocess.run(
            ['python3', script_path],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            return True, "Success"
        else:
            return False, f"Exit code {result.returncode}: {result.stderr[:200]}"
    except subprocess.TimeoutExpired:
        return False, "Timeout (>30s)"
    except Exception as e:
        return False, f"Error: {str(e)[:200]}"
    finally:
        os.unlink(script_path)


def test_javascript_example(code: str) -> Tuple[bool, str]:
    """Execute JavaScript example (basic validation only)."""
    # For now, just validate syntax - full execution would require node setup
    code = substitute_placeholders(code)

    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write(code)
        script_path = f.name

    try:
        # Check for syntax errors
        result = subprocess.run(
            ['node', '--check', script_path],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            return True, "Syntax valid (not executed)"
        else:
            return False, f"Syntax error: {result.stderr[:200]}"
    except FileNotFoundError:
        return True, "Skipped (Node.js not available)"
    except Exception as e:
        return False, f"Error: {str(e)[:200]}"
    finally:
        os.unlink(script_path)


def test_code_block(block: Dict[str, str]) -> Dict[str, any]:
    """Test a single code block."""
    code = block['code']
    language = block['language']

    # Check if should skip
    skip, skip_reason = should_skip_example(code)
    if skip:
        return {
            'file': block['file'],
            'language': language,
            'status': 'skipped',
            'message': skip_reason,
            'code_preview': code[:100]
        }

    # Execute based on language
    if language in ['bash', 'curl']:
        success, message = test_bash_example(code)
    elif language == 'python':
        success, message = test_python_example(code)
    elif language in ['javascript', 'js']:
        success, message = test_javascript_example(code)
    else:
        return {
            'file': block['file'],
            'language': language,
            'status': 'skipped',
            'message': f"Unsupported language: {language}",
            'code_preview': code[:100]
        }

    return {
        'file': block['file'],
        'language': language,
        'status': 'passed' if success else 'failed',
        'message': message,
        'code_preview': code[:100]
    }


def format_results(results: List[Dict]) -> str:
    """Format test results for GitHub step summary."""
    if not results:
        return "No testable examples found in changed files.\n"

    output = []

    # Group by file
    by_file = {}
    for result in results:
        file = result['file']
        if file not in by_file:
            by_file[file] = []
        by_file[file].append(result)

    # Summary stats
    total = len(results)
    passed = sum(1 for r in results if r['status'] == 'passed')
    failed = sum(1 for r in results if r['status'] == 'failed')
    skipped = sum(1 for r in results if r['status'] == 'skipped')

    output.append(f"\n### Summary")
    output.append(f"- ✅ Passed: {passed}/{total}")
    output.append(f"- ❌ Failed: {failed}/{total}")
    output.append(f"- ⏭️ Skipped: {skipped}/{total}")
    output.append("")

    # Details by file
    for file, file_results in by_file.items():
        output.append(f"\n### `{file}`")

        for i, result in enumerate(file_results, 1):
            status_icon = {
                'passed': '✅',
                'failed': '❌',
                'skipped': '⏭️'
            }[result['status']]

            output.append(f"\n**Example {i}** ({result['language']}) {status_icon}")
            output.append(f"- Status: {result['status']}")
            output.append(f"- Message: {result['message']}")

            if result['status'] == 'failed':
                output.append(f"```{result['language']}")
                output.append(result['code_preview'])
                output.append("```")

        output.append("")

    return "\n".join(output)


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: test-examples.py <changed_files>")
        sys.exit(0)

    changed_files_str = sys.argv[1]
    if not changed_files_str:
        print("No guide files changed - skipping example tests")
        sys.exit(0)

    changed_files = [Path(f.strip()) for f in changed_files_str.split('\n') if f.strip()]

    print(f"Testing examples in {len(changed_files)} changed guide(s)...\n")

    all_results = []
    for file_path in changed_files:
        if not file_path.exists():
            continue

        code_blocks = extract_code_blocks(file_path)
        print(f"Found {len(code_blocks)} code blocks in {file_path.name}")

        for block in code_blocks:
            result = test_code_block(block)
            all_results.append(result)

    # Output formatted results
    print(format_results(all_results))


if __name__ == '__main__':
    main()
