#!/usr/bin/env python3
"""
Inject dashboard_data.json into HTML template to create index.html

This script reads the generated dashboard_data.json and injects it into
the HTML template's <script id="store"> tag, creating a self-contained
index.html file for deployment.
"""

import json
import re
import os

def inject_json_into_html():
    """Inject JSON data into HTML template"""

    # File paths
    json_file = 'dashboard_data.json'
    template_file = 'template.html'
    output_file = 'index.html'

    # Check if template exists, if not use the HTML file as template
    if not os.path.exists(template_file):
        print(f"⚠️  Template file '{template_file}' not found. Using 'fresh_dashboard_from_template_final_v5.html' as template.")
        template_file = 'fresh_dashboard_from_template_final_v5.html'

    if not os.path.exists(template_file):
        print(f"❌ Error: Neither template.html nor fresh_dashboard_from_template_final_v5.html found!")
        return False

    # Load JSON data
    print(f"📖 Reading dashboard data from {json_file}...")
    try:
        with open(json_file, 'r') as f:
            dashboard_data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {json_file} not found. Run csv_merge_dashboard.py first!")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in {json_file}: {e}")
        return False

    # Load HTML template
    print(f"📖 Reading HTML template from {template_file}...")
    try:
        with open(template_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except FileNotFoundError:
        print(f"❌ Error: {template_file} not found!")
        return False

    # Convert JSON to compact string for embedding
    json_string = json.dumps(dashboard_data, separators=(',', ':'))

    # Find and replace the <script id="store"> content
    # Pattern matches: <script id="store" type="application/json">...</script>
    pattern = r'(<script id="store" type="application/json">)(.*?)(</script>)'

    # Check if pattern exists
    if not re.search(pattern, html_content, re.DOTALL):
        print("⚠️  Warning: Could not find <script id='store'> tag in template!")
        print("    Adding it before </body> tag...")

        # Insert before </body>
        new_script = f'<script id="store" type="application/json">{json_string}</script>\n</body>'
        html_content = html_content.replace('</body>', new_script)
    else:
        # Replace existing content
        html_content = re.sub(
            pattern,
            r'\1' + json_string + r'\3',
            html_content,
            flags=re.DOTALL
        )

    # Write output file
    print(f"💾 Writing updated HTML to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    # Get file size for confirmation
    file_size = os.path.getsize(output_file)
    print(f"✅ Successfully created {output_file} ({file_size:,} bytes)")
    print(f"   Dashboard data injected: {len(json_string):,} characters")

    return True

if __name__ == "__main__":
    print("🚀 Starting JSON injection into HTML template...\n")
    success = inject_json_into_html()

    if success:
        print("\n✅ Injection completed successfully!")
        print("   You can now deploy index.html to Netlify")
    else:
        print("\n❌ Injection failed. Please check the errors above.")
        exit(1)
