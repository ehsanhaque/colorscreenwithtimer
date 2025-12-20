#!/usr/bin/env python3
"""
Improved script to carefully remove ad placeholders from HTML files
"""

import re
from pathlib import Path

# Find all HTML files
html_files = list(Path('.').glob('**/*.html'))
# Exclude contact-form-example.html and test files
html_files = [f for f in html_files if 'contact-form-example.html' not in str(f)]

print(f"Found {len(html_files)} HTML files to process\n")

for html_file in html_files:
    print(f"Processing: {html_file}")

    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # 1. Remove the 3-column layout CSS block (only if it has the comment)
    content = re.sub(
        r'<style>\s*/\* 3-Column Layout for Ads \*/.*?</style>\s*',
        '',
        content,
        flags=re.DOTALL
    )

    # 2. Remove header banner ad section
    content = re.sub(
        r'<!-- ==================== AD PLACEHOLDER - HEADER BANNER ==================== -->.*?</div>\s*\n',
        '',
        content,
        flags=re.DOTALL
    )

    # 3. Remove the MAIN CONTENT WITH SIDEBAR ADS wrapper, keeping only the main content
    # This regex carefully extracts just the <main>...</main> section
    def replace_main_content(match):
        return match.group(1) + '\n'

    content = re.sub(
        r'<!-- ==================== MAIN CONTENT WITH SIDEBAR ADS ==================== -->\s*<div class="container-with-ads">\s*<!-- ==================== LEFT SIDEBAR AD ==================== -->\s*<aside class="sidebar-ad"[^>]*>.*?</aside>\s*<!-- ==================== MAIN CONTENT ==================== -->\s*(<main.*?</main>)\s*<!-- ==================== RIGHT SIDEBAR AD ==================== -->\s*<aside class="sidebar-ad"[^>]*>.*?</aside>\s*</div>\s*',
        replace_main_content,
        content,
        flags=re.DOTALL
    )

    # 4. Remove bottom ad section
    content = re.sub(
        r'<!-- ==================== BOTTOM AD SECTION ==================== -->.*?</div>\s*\n\s*</div>\s*\n',
        '',
        content,
        flags=re.DOTALL
    )

    # 5. Remove AdSense script comments section
    content = re.sub(
        r'<!-- ==================== AD SCRIPTS ==================== -->\s*<!-- Google AdSense -->\s*<!--\s*-->\s*\n',
        '',
        content,
        flags=re.DOTALL
    )

    # Clean up any triple+ blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)

    if content != original_content:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Removed ad placeholders")
    else:
        print(f"  - No changes needed")

print("\n✅ All HTML files processed!")
