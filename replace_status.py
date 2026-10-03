import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. serialize_asset
    content = content.replace(
        '"status":a.status',
        '"status":a.processing_status,"review_status":a.review_status'
    )
    
    # 2. Asset.status == "processing" or "ready" or "failed"
    content = re.sub(r'Asset\.status\s*==\s*"processing"', 'Asset.processing_status=="processing"', content)
    content = re.sub(r'Asset\.status\s*==\s*"ready"', '(Asset.processing_status=="ready") & (Asset.review_status=="approved")', content)
    content = re.sub(r'Asset\.status\s*==\s*"failed"', 'Asset.processing_status=="failed"', content)
    
    # 3. a.status == "ready" etc
    content = re.sub(r'a\.status\s*!=\s*"ready"', '(a.processing_status!="ready" or a.review_status!="approved")', content)
    content = re.sub(r'a\.status\s*!=\s*"failed"', 'a.processing_status!="failed"', content)
    content = content.replace('a.status="processing"', 'a.processing_status="processing"')
    content = content.replace('a.status="ready"', 'a.processing_status="ready"')
    content = content.replace('a.status="failed"', 'a.processing_status="failed"')
    content = content.replace('a.status="draft"', 'a.review_status="draft"')
    content = content.replace('Asset.status==status', 'Asset.processing_status==status') # line 216

    # 4. Ingelstion upload route: 
    content = content.replace(
        'if a.status not in {"draft", "rejected", "failed"}:',
        'if a.review_status not in {"draft", "rejected"} and a.processing_status != "failed":'
    )
    
    # 5. Transition route:
    content = content.replace('a.status not in rule[0]', 'a.review_status not in rule[0]')
    content = content.replace('a.status = rule[2]', 'a.review_status = rule[2]')
    
    # 6. add_asset (Line 228) -> status="draft"? No, add_asset didn't have status, but we should add review_status="approved" or processing_status="ready"?
    # The default for processing_status is "ready" and review_status is "draft".
    # We should let add_asset default to review_status="approved" since it's for admins?
    # Or just leave defaults.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('backend/app/main.py')
process_file('backend/app/modules/feed.py')
process_file('backend/app/worker.py')

print("Done replacing.")
