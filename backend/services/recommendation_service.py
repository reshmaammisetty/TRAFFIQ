"""
TRAFFIQ Actionable Recommendation Engine
Generates grounded rule-based recommendations strictly separating:
1. USER TRAVEL ADVICE (commuters, motorists, students)
2. TRAFFIC MANAGEMENT RECOMMENDATIONS (city operations, police, transit controllers)
"""

from typing import Dict, Any, List

class RecommendationService:
    def generate_recommendations(
        self,
        prediction_result: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Builds transparent, evidence-based recommendations.
        """
        context = context or {}
        level = prediction_result.get("prediction", "LOW").upper()
        est_metrics = prediction_result.get("estimated_metrics", {})
        
        def _to_float(v, default=0.0):
            return float(v) if v is not None else default

        def _to_int(v, default=0):
            return int(v) if v is not None else default

        tc_ratio = _to_float(est_metrics.get("estimated_tc_ratio"), 0.3)
        accident = _to_int(context.get("accident_reported"), 0)
        peak_hour = _to_int(context.get("peak_hour"), 0)
        local_event = _to_int(context.get("local_event"), 0)
        weather = context.get("weather") or "Clear"
        road_cond = context.get("road_condition") or "Good"
        rainfall = _to_float(context.get("rainfall_mm"), 0.0)
        traffic_change = _to_float(context.get("traffic_change_percent"), 0.0)

        user_advice: List[Dict[str, str]] = []
        mgmt_advice: List[Dict[str, str]] = []

        # ---------------- 1. USER TRAVEL ADVICE ----------------
        if level == "CRITICAL":
            user_advice.append({
                "type": "warning",
                "badge": "CRITICAL DELAY",
                "title": "Defer Departure or Seek Alternate Arterial",
                "detail": "Corridor is experiencing near-standstill gridlock or severe incident obstruction. Expect 30-50+ minute delays. If possible, delay trip by 45-60 minutes."
            })
        elif level == "HIGH":
            user_advice.append({
                "type": "caution",
                "badge": "SIGNIFICANT DELAY",
                "title": "Buffer Travel Time by 20-30 Minutes",
                "detail": "Heavy corridor friction and queueing detected. Drive with increased headway and avoid peak intersection choke points."
            })
        elif level == "MEDIUM":
            user_advice.append({
                "type": "info",
                "badge": "MODERATE DENSITY",
                "title": "Normal Commute with Minor Hotspots",
                "detail": "Corridor capacity is moderately occupied. Expect steady movement with brief signal cycle delays."
            })
        else: # LOW
            user_advice.append({
                "type": "success",
                "badge": "OPTIMAL CONDITIONS",
                "title": "Ideal Departure Window",
                "detail": "Free-flowing speeds observed across corridor lanes. No expected bottlenecks."
            })

        if accident == 1:
            user_advice.append({
                "type": "danger",
                "badge": "INCIDENT BLOCKAGE",
                "title": "Carriageway Obstruction Ahead",
                "detail": "Active collision reported. Approaching vehicles should slow down, watch for emergency crews, and prepare for sudden lane mergers."
            })

        if weather in ["Heavy Rain", "Rainy"] or rainfall > 10.0 or road_cond == "Waterlogging":
            user_advice.append({
                "type": "caution",
                "badge": "WEATHER HAZARD",
                "title": "Wet Surface & Low Visibility Caution",
                "detail": "Road friction is significantly reduced. Increase following distance to at least 4 vehicle lengths and use dipped headlights."
            })

        if road_cond in ["Construction", "Potholes"]:
            user_advice.append({
                "type": "info",
                "badge": "SURFACE CAUTION",
                "title": f"Surface Alert: {road_cond}",
                "detail": "Active work zones or degraded asphalt require reduced travel speeds and vigilance."
            })

        # ---------------- 2. TRAFFIC MANAGEMENT RECOMMENDATIONS ----------------
        if level in ["HIGH", "CRITICAL"] or tc_ratio >= 0.65:
            mgmt_advice.append({
                "category": "Signal Optimization",
                "priority": "HIGH",
                "action": "Deploy Dynamic Green Wave Extension",
                "detail": "Extend green split by +15-20 seconds for dominant arterial phase to prevent upstream queue spillback onto feeder links."
            })
            mgmt_advice.append({
                "category": "Field Deployment",
                "priority": "HIGH",
                "action": "Dispatch Traffic Marshals / PCR Units",
                "detail": "Deploy field personnel to key roundabouts and un-signalized merges to prevent deadlocks and enforce lane discipline."
            })
        elif level == "MEDIUM":
            mgmt_advice.append({
                "category": "Monitoring",
                "priority": "MEDIUM",
                "action": "Activate Automated Sensor Polling",
                "detail": "Corridor approaching 50% capacity. Increase camera detection polling to 3-minute intervals to catch sudden surges early."
            })
        else:
            mgmt_advice.append({
                "category": "Routine Operations",
                "priority": "LOW",
                "action": "Maintain Baseline Signal Time Allocation",
                "detail": "Standard coordinated timing plans are functioning efficiently within design limits."
            })

        if accident == 1:
            mgmt_advice.append({
                "category": "Incident Clearance",
                "priority": "CRITICAL",
                "action": "Immediate Tow Vehicle & EMS Coordination",
                "detail": "Clear disabled vehicles to roadside shoulder within 12 minutes to avert exponential queue formation."
            })

        if local_event == 1:
            mgmt_advice.append({
                "category": "Special Event Routing",
                "priority": "HIGH",
                "action": "Variable Message Sign (VMS) Advisory",
                "detail": "Display event diversion advisories on upstream digital signage to redistribute non-local through-traffic."
            })

        if traffic_change > 20.0:
            mgmt_advice.append({
                "category": "Surge Mitigation",
                "priority": "HIGH",
                "action": f"Inflow Throttling (+{traffic_change}% Surge)",
                "detail": "Meter ramp and feeder entrance volumes by 15% to buffer main corridor capacity."
            })

        return {
            "status": "success",
            "congestion_level": level,
            "disclaimer": "Recommendations are dataset-informed advisory insights for smart city evaluation. Real-world implementation requires verified field verification.",
            "user_travel_advice": user_advice,
            "traffic_management_recommendations": mgmt_advice
        }

recommendation_service = RecommendationService()
