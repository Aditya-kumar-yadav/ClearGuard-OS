import requests
import json
import time

BASE_URL = "http://localhost:8000"

print("==================================================")
print("TEST 1: Cryptographic State Hash & Audit Endpoint")
print("==================================================")
txs = requests.get(f"{BASE_URL}/api/transactions").json()
print(f"Total Transactions in Ledger: {len(txs)}")
for t in txs[:4]:
    short_h = t.get("state_hash", "")[:16]
    chain_len = len(t.get("state_chain", []))
    print(f"[{t['id']}] Status: {t['status']:<10} | Hash: 0x{short_h}... | Steps: {chain_len}")

# Audit verification on healthy transaction
audit_res = requests.get(f"{BASE_URL}/api/audit/{txs[0]['id']}")
print(f"\nAudit Response for {txs[0]['id']}:")
print(json.dumps(audit_res.json(), indent=2))
assert audit_res.json().get("status") == "VERIFIED", "Expected VERIFIED status"

# Simulate tampering of database row
print("\nSimulating Malicious Database Tampering...")
tamper_res = requests.post(f"{BASE_URL}/api/audit/simulate-tamper/{txs[0]['id']}")
print(f"Tamper simulation response: {tamper_res.json().get('status')}")

# Audit again to confirm it flags as CORRUPTED
corrupted_audit = requests.get(f"{BASE_URL}/api/audit/{txs[0]['id']}")
print("\nAudit Response after database tampering:")
print(json.dumps(corrupted_audit.json(), indent=2))
assert corrupted_audit.json().get("status") == "CORRUPTED", "Expected CORRUPTED status"

# Repair the transaction
print("\nRepairing transaction state...")
requests.post(f"{BASE_URL}/api/audit/repair/{txs[0]['id']}")
repaired_audit = requests.get(f"{BASE_URL}/api/audit/{txs[0]['id']}")
assert repaired_audit.json().get("status") == "VERIFIED", "Expected repaired VERIFIED status"
print("SUCCESS: Phase 1 Cryptographic Immutable Ledger Verified!\n")

print("==================================================")
print("TEST 2: Strict Webhook Signature Verification")
print("==================================================")
# 1. Raw unverified POST must be rejected with 401
raw_res = requests.post(f"{BASE_URL}/api/webhook", json={"event_type": "DELIVERY_CONFIRMED"})
print(f"Raw POST status code: {raw_res.status_code} (Expected 401)")
assert raw_res.status_code == 401, f"Expected 401 Unauthorized, got {raw_res.status_code}"
print(f"Detail: {raw_res.json().get('detail')}")

# 2. Forged signature POST must be rejected with 401
forged_headers = {
    "PAYPAL-AUTH-ALGO": "SHA256withRSA",
    "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
    "PAYPAL-TRANSMISSION-ID": "FAKE-ID-999",
    "PAYPAL-TRANSMISSION-TIME": "2026-11-08T12:00:00Z",
    "PAYPAL-TRANSMISSION-SIG": "FORGED_SIGNATURE_DATA_STRING"
}
forged_res = requests.post(f"{BASE_URL}/api/webhook", json={"event_type": "DELIVERY_CONFIRMED"}, headers=forged_headers)
print(f"Forged Signature POST status code: {forged_res.status_code} (Expected 401)")
assert forged_res.status_code == 401, f"Expected 401 Unauthorized, got {forged_res.status_code}"

# 3. Valid cryptographically signed simulation POST must succeed with 200
valid_headers = {
    "PAYPAL-AUTH-ALGO": "SHA256withRSA",
    "PAYPAL-CERT-URL": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-TEST.pem",
    "PAYPAL-TRANSMISSION-ID": "TRANS-VERIFIED-001",
    "PAYPAL-TRANSMISSION-TIME": "2026-11-08T12:00:00Z",
    "PAYPAL-TRANSMISSION-SIG": "TEST_SIMULATED_VERIFIED_PAYPAL_SIG"
}
valid_res = requests.post(
    f"{BASE_URL}/api/webhook",
    json={"event_type": "DELIVERY_CONFIRMED", "transaction_id": txs[0]['id']},
    headers=valid_headers
)
print(f"Verified Webhook POST status code: {valid_res.status_code} (Expected 200)")
print(f"Response: {json.dumps(valid_res.json(), indent=2)}")
assert valid_res.status_code == 200, f"Expected 200 OK, got {valid_res.status_code}"
print("SUCCESS: Phase 2 Webhook Signature Security Verified!\n")

print("==================================================")
print("TEST 3: Agent Rate Limiting (Blast Radius / DDoS)")
print("==================================================")
# Reset kill switch first
requests.post(f"{BASE_URL}/api/kill-switch/reset")

# Fire requests rapidly to test the 5/minute slowapi limit
hit_429 = False
statuses = []
for i in range(7):
    r = requests.post(
        f"{BASE_URL}/api/validate_transaction",
        json={"item_name": f"Rate Limit Test {i}", "category": "electronics", "amount": "100.00"}
    )
    statuses.append(r.status_code)
    if r.status_code == 429:
        hit_429 = True
        print(f"Request #{i+1} BLOCKED with 429 Too Many Requests:")
        print(json.dumps(r.json(), indent=2))
        break

print(f"Sequence of status codes: {statuses}")
assert hit_429, "Expected to trigger 429 Too Many Requests after 5 requests!"
print("SUCCESS: Phase 4 Agent Rate Limiter Verified!\n")

