import time
import threading
from typing import Dict, Any, List

class AutonomousKillSwitch:
    """
    Enterprise Blast Radius Containment & Circuit Breaker:
    - Monitors dispute frequency & anomaly attack rates in rolling time windows.
    - If >= 3 disputes occur within 5 minutes or consecutive rogue attacks spike:
      Autonomously triggers Emergency Lockdown.
    - Instantly freezes all agent procurement tools, revokes execution, and halts PayPal escrows.
    """

    def __init__(self, max_disputes_window: int = 3, window_seconds: int = 300):
        self.max_disputes = max_disputes_window
        self.window_seconds = window_seconds
        self.dispute_timestamps: List[float] = []
        self.attack_timestamps: List[float] = []
        self.is_locked_down: bool = False
        self.lockdown_reason: str = ""
        self.lockdown_triggered_at: str = ""
        self.lock = threading.Lock()

    def record_dispute(self, dispute_id: str) -> bool:
        """Records a dispute and checks if threshold is breached. Returns True if lockdown triggered."""
        with self.lock:
            now = time.time()
            self.dispute_timestamps.append(now)
            # Prune events outside window
            self.dispute_timestamps = [t for t in self.dispute_timestamps if now - t <= self.window_seconds]

            if len(self.dispute_timestamps) >= self.max_disputes and not self.is_locked_down:
                self.is_locked_down = True
                self.lockdown_reason = f"CRITICAL ANOMALY: {len(self.dispute_timestamps)} PayPal Disputes detected in < {self.window_seconds // 60} minutes. Blast radius containment active."
                self.lockdown_triggered_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                return True
        return self.is_locked_down

    def record_attack(self, attack_reason: str) -> bool:
        """Records a 403 attack and checks if attack spike threshold is reached."""
        with self.lock:
            now = time.time()
            self.attack_timestamps.append(now)
            self.attack_timestamps = [t for t in self.attack_timestamps if now - t <= 120]

            if len(self.attack_timestamps) >= 3 and not self.is_locked_down:
                self.is_locked_down = True
                self.lockdown_reason = "CRITICAL SECURITY SPIKE: 3 Consecutive high-risk injection/budget breaches detected. Autonomous circuit breaker engaged."
                self.lockdown_triggered_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                return True
        return self.is_locked_down

    def trigger_manual_lockdown(self, reason: str = "Admin manual trigger for enterprise demo containment") -> Dict[str, Any]:
        """Manually trips the circuit breaker for live demo testing."""
        with self.lock:
            self.is_locked_down = True
            self.lockdown_reason = reason
            self.lockdown_triggered_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return self.get_status()

    def reset_lockdown(self) -> Dict[str, Any]:
        """Disarms circuit breaker and restores procurement authority."""
        with self.lock:
            self.is_locked_down = False
            self.lockdown_reason = ""
            self.lockdown_triggered_at = ""
            self.dispute_timestamps = []
            self.attack_timestamps = []
        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            now = time.time()
            recent_disputes = len([t for t in self.dispute_timestamps if now - t <= self.window_seconds])
            recent_attacks = len([t for t in self.attack_timestamps if now - t <= 120])
            return {
                "is_locked_down": self.is_locked_down,
                "lockdown_reason": self.lockdown_reason,
                "lockdown_triggered_at": self.lockdown_triggered_at,
                "recent_disputes_count": recent_disputes,
                "max_disputes_threshold": self.max_disputes,
                "recent_attacks_count": recent_attacks,
                "circuit_breaker_healthy": not self.is_locked_down
            }

kill_switch = AutonomousKillSwitch()

