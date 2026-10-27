import requests

r = requests.get('http://localhost:8000/api/batches')
print(f'Status: {r.status_code}')
print(f'Batches count: {len(r.json())}')
for batch in r.json():
    print(f'  - {batch["batch_code"]}: {batch["batch_name"]}')
