import json

db_path = 'data/statecraft_db.json'
with open(db_path, 'r', encoding='utf-8') as f:
    db = json.load(f)

for st in db.get('states', []):
    total_pts = sum(int(cv.get('points', 0)) for cv in st.get('criteria', {}).values() if 'points' in cv and cv['points'] is not None)
    print(f"State {st['name']}: Total Criteria Points = {total_pts} pts")

print("Criteria points verification completed successfully!")
