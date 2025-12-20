#!/usr/bin/env python3
"""
Script to remove all ad placeholders from HTML files
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

    # Remove the 3-column layout CSS
    content = re.sub(
        r'<style>\s*\/\* 3-Column Layout for Ads \*\/.*?<\/style>',
        '',
        content,
        flags=re.DOTALL
    )

    # Remove header banner ad
    content = re.sub(
        r'<!-- ==================== AD PLACEHOLDER - HEADER BANNER ==================== -->.*?</div>\s*</div>',
        '',
        content,
        flags=re.DOTALL
    )

    # Remove the container-with-ads wrapper and sidebar ads, keep main content
    # Pattern: <div class="container-with-ads"> ... <aside class="sidebar-ad"> ... </aside> ... <main> ... </main> ... <aside> ... </aside> ... </div>
    content = re.sub(
        r'<!-- ==================== MAIN CONTENT WITH SIDEBAR ADS ==================== -->\s*<div class="container-with-ads">\s*<!-- ==================== LEFT SIDEBAR AD ==================== -->\s*<aside class="sidebar-ad"[^>]*>.*?</aside>\s*<!-- ==================== MAIN CONTENT ==================== -->\s*(<main[^>]*>.*?</main>)\s*<!-- ==================== RIGHT SIDEBAR AD ==================== -->\s*<aside class="sidebar-ad"[^>]*>.*?</aside>\s*</div>',
        r'\1',
        content,
        flags=re.DOTALL
    )

    # Remove bottom ad section
    content = re.sub(
        r'<!-- ==================== BOTTOM AD SECTION ==================== -->.*?</div>\s*</div>',
        '',
        content,
        flags=re.DOTALL
    )

    # Remove any remaining ad blocks (Medium Rectangle Ads)
    content = re.sub(
        r'<!-- Two Medium Rectangle Ads Side by Side \(300x250 each\) -->.*?</div>\s*</div>',
        '',
        content,
        flags=re.DOTALL
    )

    # Remove any standalone ad divs with "AD PLACEHOLDER" text
    content = re.sub(
        r'<div[^>]*>\s*(?:<!--[^>]*?-->)?\s*<div[^>]*>.*?AD PLACEHOLDER.*?</div>\s*</div>',
        '',
        content,
        flags=re.DOTALL
    )

    # Clean up any extra blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)

    if content != original_content:
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Removed ad placeholders")
    else:
        print(f"  - No changes needed")

print("\n✅ All HTML files processed!")
