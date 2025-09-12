#!/usr/bin/env python3
"""
Parse PROSPECT STATE TAGS CSV and generate SQL INSERT statements for tags_taxonomy table
"""
import csv
import re

def parse_csv_to_sql():
    csv_file = "PROSPECT STATE TAGS - real_estate_conversation_master_tag_guide (1).csv"
    
    tags_data = []
    seen_tags = set()
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            tag = row['tag'].strip()
            definition = row['tag_definition'].strip()
            
            if tag and tag not in seen_tags:
                seen_tags.add(tag)
                
                if ':' in tag:
                    category = tag.split(':')[0]
                else:
                    category = 'general'
                
                tags_data.append({
                    'tag': tag,
                    'definition': definition,
                    'category': category
                })
    
    sql_statements = []
    sql_statements.append("-- Populate tags_taxonomy table from CSV data")
    sql_statements.append("INSERT INTO public.tags_taxonomy (tag, definition, category) VALUES")
    
    values = []
    for i, tag_data in enumerate(tags_data):
        tag = tag_data['tag'].replace("'", "''")
        definition = tag_data['definition'].replace("'", "''")
        category = tag_data['category'].replace("'", "''")
        
        values.append(f"    ('{tag}', '{definition}', '{category}')")
    
    sql_statements.append(',\n'.join(values))
    sql_statements.append("ON CONFLICT (tag) DO NOTHING;")
    sql_statements.append("")
    sql_statements.append(f"-- Total tags inserted: {len(tags_data)}")
    
    return '\n'.join(sql_statements)

if __name__ == "__main__":
    sql_output = parse_csv_to_sql()
    
    with open('tags-taxonomy-data.sql', 'w', encoding='utf-8') as f:
        f.write(sql_output)
    
    print(f"Generated tags-taxonomy-data.sql with {sql_output.count('(')} tag entries")
    print("Preview of first few entries:")
    print('\n'.join(sql_output.split('\n')[:10]))
