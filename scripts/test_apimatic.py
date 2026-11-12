import sys
sys.path.append(r"c:\Users\bitd\Downloads\paypal\aurorapay-os\agents")
from tools.apimatic_plugin import APIMaticContextPlugin

print("Testing APIMatic OpenAPI Schema Declarations...")
tools = APIMaticContextPlugin.get_gemini_tool_declarations()
print(f"Generated {len(tools)} APIMatic Gemini tool declarations.")
for t in tools:
    name = t["name"]
    req = t["parameters"]["required"]
    print(f" - Tool: {name} | Required: {req}")

# Test 1: Valid payload
valid_payload = {
    "item_name": "Lenovo ThinkPad",
    "category": "electronics",
    "amount": 48000.0,
    "merchant_name": "Lenovo Direct",
    "intent": "AUTHORIZE"
}
ok, err = APIMaticContextPlugin.validate_tool_payload("paypal_orders_v2_authorize", valid_payload)
print(f"\nValid Payload Verification: ok={ok}, error={err}")
assert ok, "Valid payload should pass"

# Test 2: Hallucinated property (Zero-Hallucination Interception)
hallucinated_payload = {
    "item_name": "Lenovo ThinkPad",
    "category": "electronics",
    "amount": 48000.0,
    "merchant_name": "Lenovo Direct",
    "hallucinated_rebate_discount": 5000.0
}
ok_h, err_h = APIMaticContextPlugin.validate_tool_payload("paypal_orders_v2_authorize", hallucinated_payload)
print(f"Hallucinated Payload Interception: ok={ok_h}, error={err_h}")
assert not ok_h, "Hallucinated payload must be intercepted"
print("SUCCESS: APIMatic Zero-Hallucination Tooling Verified!")

