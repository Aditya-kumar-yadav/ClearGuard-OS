from datetime import datetime
from typing import Dict, Any

def check_shipping_status(order_id: str, tracking_number: str = "", force_state: str = None) -> Dict[str, Any]:
    """
    MCP Tool: Queries carrier logistics telematics to inspect package delivery status.
    Returns: 'In Transit', 'Delivered', or 'Lost'.
    """
    now = datetime.utcnow().isoformat()
    state = force_state or "Lost"

    if state.lower() in ("lost", "lost/damaged", "damaged"):
        return {
            "order_id": order_id,
            "tracking_number": tracking_number or "TRK881920B",
            "shipping_status": "Lost",
            "carrier": "BlueDart Express Commercial",
            "last_telematics_event": "CRITICAL EXCEPTION: Package crushed and contents declared total loss in transit facility",
            "hub_location": "Sort Facility Depot B-4",
            "timestamp": now,
            "declaration_code": "CARRIER_LOSS_DECLARED_DEPOT"
        }
    elif state.lower() == "delivered":
        return {
            "order_id": order_id,
            "tracking_number": tracking_number,
            "shipping_status": "Delivered",
            "carrier": "BlueDart Express",
            "last_telematics_event": "Delivered to commercial bay and signed by recipient",
            "timestamp": now
        }
    else:
        return {
            "order_id": order_id,
            "tracking_number": tracking_number,
            "shipping_status": "In Transit",
            "carrier": "BlueDart Express",
            "last_telematics_event": "Package departed logistics hub",
            "timestamp": now
        }

