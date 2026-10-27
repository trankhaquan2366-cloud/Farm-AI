import requests

payload = {
    'batch_name': 'Second Batch',
    'plot_id': 1,
    'variety_id': 1,
    'seeding_date': '2026-08-20'
}

r = requests.post('http://localhost:8000/api/batches', json=payload)
print(f'Status: {r.status_code}')
print(f'Batch Code: {r.json()["batch_code"]}')
print(f'Expected Harvest: {r.json()["expected_harvest_date"]}')
