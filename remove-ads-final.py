#!/usr/bin/env python3
"""
Final cleanup to remove remaining ad placeholders
"""

import re
from pathlib import Path

# Find all HTML files
html_files = list(Path('.').glob('**/*.html'))
# Exclude test files
html_files = [f for f in html_files if 'contact-form-example.html' not in str(f) and 'remove-ads' not in str(f)]

print(f"Found {len(html_files)} HTML files to process\n")

for html_file in html_files:
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Remove any remaining "Two Medium Rectangle Ads" sections
    content = re.sub(
        r'<!-- Two Medium Rectangle Ads Side by Side \(300x250 each\) -->.*?</div>\s*</div>\s*\n\s*</div>',
        '\n</div>',
        content,
        flags=re.DOTALL
    )

    # Clean up triple+ blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)

    if content != original_content:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ {html_file}")

print("\n✅ Final cleanup complete!")
