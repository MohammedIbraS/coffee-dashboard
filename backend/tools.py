import json
import os
from datetime import date, timedelta
from typing import Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# ---------------------------------------------------------------------------
# Load data once at module import
# ---------------------------------------------------------------------------

def _load(filename: str):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)

STORES = _load("stores.json")
PRODUCTS = _load("products.json")
DAILY_SALES = _load("daily_sales.json")
PRODUCT_SALES = _load("product_sales.json")
HOURLY_DATA = _load("hourly_data.json")

STORE_IDS = {s["name"].lower(): s["id"] for s in STORES}
ALL_DATES = sorted(set(r["date"] for r in DAILY_SALES))


# ---------------------------------------------------------------------------
# Period helpers
# ---------------------------------------------------------------------------

def _resolve_period(period: str):
    """Return (start_date_str, end_date_str) for a named period."""
    today = date(2025, 12, 31)  # anchor to end of our data

    if period == "today":
        return today.isoformat(), today.isoformat()
    if period in ("last_7_days", "last_week"):
        start = today - timedelta(days=6)
        return start.isoformat(), today.isoformat()
    if period in ("last_30_days", "last_month"):
        start = today - timedelta(days=29)
        return start.isoformat(), today.isoformat()
    if period in ("last_90_days", "last_quarter"):
        start = today - timedelta(days=89)
        return start.isoformat(), today.isoformat()
    if period == "this_year" or period == "ytd":
        return "2025-01-01", today.isoformat()

    # Month name  e.g. "january", "february"
    month_names = {
        "january": 1, "february": 2, "march": 3, "april": 4,
        "may": 5, "june": 6, "july": 7, "august": 8,
        "september": 9, "october": 10, "november": 11, "december": 12,
    }
    key = period.lower().strip()
    if key in month_names:
        m = month_names[key]
        import calendar
        last_day = calendar.monthrange(2025, m)[1]
        return f"2025-{m:02d}-01", f"2025-{m:02d}-{last_day:02d}"

    # Quarter  e.g. "q1", "q2"
    quarters = {"q1": ("2025-01-01", "2025-03-31"),
                "q2": ("2025-04-01", "2025-06-30"),
                "q3": ("2025-07-01", "2025-09-30"),
                "q4": ("2025-10-01", "2025-12-31")}
    if key in quarters:
        return quarters[key]

    # Exact date range  e.g. "2025-06-15 to 2025-07-10"
    if " to " in period:
        parts = period.split(" to ")
        if len(parts) == 2:
            try:
                s = date.fromisoformat(parts[0].strip())
                e = date.fromisoformat(parts[1].strip())
                return s.isoformat(), e.isoformat()
            except ValueError:
                pass

    # Default
    return "2025-01-01", today.isoformat()


def _filter_daily(store_id: Optional[str], start: str, end: str):
    rows = DAILY_SALES
    if store_id:
        rows = [r for r in rows if r["store_id"] == store_id]
    rows = [r for r in rows if start <= r["date"] <= end]
    return rows


def _resolve_store_id(store_name: Optional[str]) -> Optional[str]:
    if not store_name:
        return None
    key = store_name.lower().strip()
    # exact id
    if key in {s["id"] for s in STORES}:
        return key
    # name lookup
    for s in STORES:
        if key in s["name"].lower():
            return s["id"]
    return None


# ---------------------------------------------------------------------------
# Tool functions (called by Claude via tool_use)
# ---------------------------------------------------------------------------

def get_revenue(store_name: Optional[str] = None, period: str = "last_30_days", group_by: str = "day"):
    """Return revenue data over time, optionally per store."""
    store_id = _resolve_store_id(store_name)
    start, end = _resolve_period(period)
    rows = _filter_daily(store_id, start, end)

    if group_by == "day":
        # Aggregate by date (multiple stores summed if no filter)
        agg = {}
        for r in rows:
            d = r["date"]
            agg[d] = agg.get(d, 0) + r["revenue"]
        data = [{"date": d, "revenue": round(v, 2)} for d, v in sorted(agg.items())]

    elif group_by == "month":
        agg = {}
        for r in rows:
            m = r["date"][:7]
            agg[m] = agg.get(m, 0) + r["revenue"]
        data = [{"month": m, "revenue": round(v, 2)} for m, v in sorted(agg.items())]

    elif group_by == "store":
        agg = {}
        names = {}
        for r in rows:
            sid = r["store_id"]
            agg[sid] = agg.get(sid, 0) + r["revenue"]
            names[sid] = r["store_name"]
        data = [{"store": names[sid], "revenue": round(v, 2)} for sid, v in sorted(agg.items(), key=lambda x: -x[1])]

    else:
        data = []

    total = round(sum(r["revenue"] for r in rows), 2)
    return {
        "period": f"{start} to {end}",
        "store_filter": store_name,
        "group_by": group_by,
        "total_revenue": total,
        "data": data,
    }


def get_top_products(store_name: Optional[str] = None, period: str = "last_30_days", limit: int = 10, metric: str = "revenue"):
    """Return top-selling products by revenue or quantity."""
    store_id = _resolve_store_id(store_name)
    start, end = _resolve_period(period)

    # Product sales are monthly; map to months in range
    start_month = start[:7]
    end_month = end[:7]

    rows = PRODUCT_SALES
    if store_id:
        rows = [r for r in rows if r["store_id"] == store_id]
    rows = [r for r in rows if start_month <= r["month"] <= end_month]

    agg = {}
    for r in rows:
        pid = r["product_id"]
        if pid not in agg:
            agg[pid] = {"product": r["product_name"], "category": r["category"],
                        "revenue": 0, "quantity": 0}
        agg[pid]["revenue"] += r["revenue"]
        agg[pid]["quantity"] += r["quantity"]

    sort_key = "revenue" if metric == "revenue" else "quantity"
    ranked = sorted(agg.values(), key=lambda x: -x[sort_key])[:limit]
    for item in ranked:
        item["revenue"] = round(item["revenue"], 2)

    return {
        "period": f"{start_month} to {end_month}",
        "store_filter": store_name,
        "metric": metric,
        "data": ranked,
    }


def get_peak_hours(store_name: Optional[str] = None, day_type: str = "weekday"):
    """Return average order count by hour of day."""
    store_id = _resolve_store_id(store_name)
    rows = HOURLY_DATA
    if store_id:
        rows = [r for r in rows if r["store_id"] == store_id]

    # Aggregate across stores if no filter
    agg = {}
    for r in rows:
        h = r["hour"]
        val = r["avg_orders_weekday"] if day_type == "weekday" else r["avg_orders_weekend"]
        agg[h] = agg.get(h, 0) + val

    # If multiple stores, average them
    n_stores = len(set(r["store_id"] for r in rows))
    data = [{"hour": f"{h:02d}:00", "avg_orders": round(v / n_stores, 1)}
            for h, v in sorted(agg.items())]

    return {
        "store_filter": store_name,
        "day_type": day_type,
        "data": data,
    }


def get_store_comparison(metric: str = "revenue", period: str = "last_30_days"):
    """Compare all stores on a given metric."""
    start, end = _resolve_period(period)
    rows = _filter_daily(None, start, end)

    agg = {}
    names = {}
    for r in rows:
        sid = r["store_id"]
        names[sid] = r["store_name"]
        if sid not in agg:
            agg[sid] = {"revenue": 0, "order_count": 0, "days": 0}
        agg[sid]["revenue"] += r["revenue"]
        agg[sid]["order_count"] += r["order_count"]
        agg[sid]["days"] += 1

    data = []
    for sid, vals in agg.items():
        avg_order_value = round(vals["revenue"] / vals["order_count"], 2) if vals["order_count"] else 0
        data.append({
            "store": names[sid],
            "revenue": round(vals["revenue"], 2),
            "order_count": vals["order_count"],
            "avg_order_value": avg_order_value,
        })

    # Sort by requested metric
    sort_map = {"revenue": "revenue", "order_count": "order_count", "avg_order_value": "avg_order_value"}
    sk = sort_map.get(metric, "revenue")
    data.sort(key=lambda x: -x[sk])

    return {
        "period": f"{start} to {end}",
        "metric": metric,
        "data": data,
    }


def get_order_count(store_name: Optional[str] = None, period: str = "last_30_days", group_by: str = "day"):
    """Return order count over time."""
    store_id = _resolve_store_id(store_name)
    start, end = _resolve_period(period)
    rows = _filter_daily(store_id, start, end)

    if group_by == "day":
        agg = {}
        for r in rows:
            d = r["date"]
            agg[d] = agg.get(d, 0) + r["order_count"]
        data = [{"date": d, "order_count": v} for d, v in sorted(agg.items())]
    elif group_by == "month":
        agg = {}
        for r in rows:
            m = r["date"][:7]
            agg[m] = agg.get(m, 0) + r["order_count"]
        data = [{"month": m, "order_count": v} for m, v in sorted(agg.items())]
    elif group_by == "store":
        agg = {}
        names = {}
        for r in rows:
            sid = r["store_id"]
            agg[sid] = agg.get(sid, 0) + r["order_count"]
            names[sid] = r["store_name"]
        data = [{"store": names[sid], "order_count": v} for sid, v in sorted(agg.items(), key=lambda x: -x[1])]
    else:
        data = []

    total = sum(r["order_count"] for r in rows)
    return {
        "period": f"{start} to {end}",
        "store_filter": store_name,
        "group_by": group_by,
        "total_orders": total,
        "data": data,
    }


def get_average_order_value(store_name: Optional[str] = None, period: str = "last_30_days", group_by: str = "month"):
    """Return average order value trend."""
    store_id = _resolve_store_id(store_name)
    start, end = _resolve_period(period)
    rows = _filter_daily(store_id, start, end)

    if group_by == "month":
        agg = {}
        for r in rows:
            m = r["date"][:7]
            if m not in agg:
                agg[m] = {"revenue": 0, "orders": 0}
            agg[m]["revenue"] += r["revenue"]
            agg[m]["orders"] += r["order_count"]
        data = [{"month": m, "avg_order_value": round(v["revenue"] / v["orders"], 2) if v["orders"] else 0}
                for m, v in sorted(agg.items())]
    elif group_by == "store":
        agg = {}
        names = {}
        for r in rows:
            sid = r["store_id"]
            names[sid] = r["store_name"]
            if sid not in agg:
                agg[sid] = {"revenue": 0, "orders": 0}
            agg[sid]["revenue"] += r["revenue"]
            agg[sid]["orders"] += r["order_count"]
        data = [{"store": names[sid], "avg_order_value": round(v["revenue"] / v["orders"], 2) if v["orders"] else 0}
                for sid, v in agg.items()]
        data.sort(key=lambda x: -x["avg_order_value"])
    else:
        total_rev = sum(r["revenue"] for r in rows)
        total_ord = sum(r["order_count"] for r in rows)
        data = [{"avg_order_value": round(total_rev / total_ord, 2) if total_ord else 0}]

    total_rev = sum(r["revenue"] for r in rows)
    total_ord = sum(r["order_count"] for r in rows)
    overall_aov = round(total_rev / total_ord, 2) if total_ord else 0

    return {
        "period": f"{start} to {end}",
        "store_filter": store_name,
        "overall_avg_order_value": overall_aov,
        "group_by": group_by,
        "data": data,
    }


def get_kpi_summary(period: str = "last_30_days"):
    """Return all top-level KPIs in one call for dashboard summary cards."""
    start, end = _resolve_period(period)
    rows = _filter_daily(None, start, end)

    total_revenue = round(sum(r["revenue"] for r in rows), 2)
    total_orders = sum(r["order_count"] for r in rows)
    aov = round(total_revenue / total_orders, 2) if total_orders else 0

    # Best store
    store_rev = {}
    store_names = {}
    for r in rows:
        sid = r["store_id"]
        store_rev[sid] = store_rev.get(sid, 0) + r["revenue"]
        store_names[sid] = r["store_name"]
    best_store = max(store_rev, key=store_rev.get) if store_rev else None

    # Compare with previous period of same length
    period_days = (date.fromisoformat(end) - date.fromisoformat(start)).days + 1
    prev_end = date.fromisoformat(start) - timedelta(days=1)
    prev_start = prev_end - timedelta(days=period_days - 1)
    prev_rows = _filter_daily(None, prev_start.isoformat(), prev_end.isoformat())
    prev_revenue = round(sum(r["revenue"] for r in prev_rows), 2)
    prev_orders = sum(r["order_count"] for r in prev_rows)

    revenue_change = round(((total_revenue - prev_revenue) / prev_revenue * 100), 1) if prev_revenue else 0
    orders_change = round(((total_orders - prev_orders) / prev_orders * 100), 1) if prev_orders else 0

    return {
        "period": f"{start} to {end}",
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "avg_order_value": aov,
        "best_store": store_names.get(best_store, "N/A"),
        "best_store_revenue": round(store_rev.get(best_store, 0), 2),
        "revenue_change_pct": revenue_change,
        "orders_change_pct": orders_change,
    }


def get_product_trend(product_name: str, period: str = "this_year", group_by: str = "month"):
    """Return sales trend for a single product over time or broken down by store."""
    start, end = _resolve_period(period)
    start_month = start[:7]
    end_month = end[:7]

    rows = [r for r in PRODUCT_SALES
            if r["product_name"].lower() == product_name.lower().strip()
            and start_month <= r["month"] <= end_month]

    if not rows:
        # Try partial match
        rows = [r for r in PRODUCT_SALES
                if product_name.lower().strip() in r["product_name"].lower()
                and start_month <= r["month"] <= end_month]

    if group_by == "month":
        agg = {}
        for r in rows:
            m = r["month"]
            if m not in agg:
                agg[m] = {"revenue": 0, "quantity": 0}
            agg[m]["revenue"] += r["revenue"]
            agg[m]["quantity"] += r["quantity"]
        data = [{"month": m, "revenue": round(v["revenue"], 2), "quantity": v["quantity"]}
                for m, v in sorted(agg.items())]
    elif group_by == "store":
        agg = {}
        for r in rows:
            s = r["store_name"]
            if s not in agg:
                agg[s] = {"revenue": 0, "quantity": 0}
            agg[s]["revenue"] += r["revenue"]
            agg[s]["quantity"] += r["quantity"]
        data = sorted(
            [{"store": s, "revenue": round(v["revenue"], 2), "quantity": v["quantity"]} for s, v in agg.items()],
            key=lambda x: -x["revenue"]
        )
    else:
        data = []

    total_rev = round(sum(r["revenue"] for r in rows), 2)
    total_qty = sum(r["quantity"] for r in rows)
    matched_name = rows[0]["product_name"] if rows else product_name

    return {
        "product_name": matched_name,
        "period": f"{start_month} to {end_month}",
        "group_by": group_by,
        "total_revenue": total_rev,
        "total_quantity": total_qty,
        "data": data,
    }


def get_category_breakdown(period: str = "this_year", store_name: Optional[str] = None):
    """Return revenue and quantity broken down by product category."""
    store_id = _resolve_store_id(store_name)
    start, end = _resolve_period(period)
    start_month = start[:7]
    end_month = end[:7]

    rows = PRODUCT_SALES
    if store_id:
        rows = [r for r in rows if r["store_id"] == store_id]
    rows = [r for r in rows if start_month <= r["month"] <= end_month]

    agg = {}
    for r in rows:
        cat = r["category"]
        if cat not in agg:
            agg[cat] = {"revenue": 0, "quantity": 0}
        agg[cat]["revenue"] += r["revenue"]
        agg[cat]["quantity"] += r["quantity"]

    data = sorted(
        [{"category": cat, "revenue": round(v["revenue"], 2), "quantity": v["quantity"]}
         for cat, v in agg.items()],
        key=lambda x: -x["revenue"]
    )

    return {
        "period": f"{start_month} to {end_month}",
        "store_filter": store_name,
        "data": data,
    }


def get_revenue_forecast(store_name: Optional[str] = None, days_ahead: int = 7):
    """Return last 30 days of daily revenue plus a simple 7-day moving average forecast."""
    from datetime import date as _date
    store_id = _resolve_store_id(store_name)
    end = _date(2025, 12, 31)
    start = end - timedelta(days=29)
    rows = _filter_daily(store_id, start.isoformat(), end.isoformat())

    # Aggregate by date
    agg = {}
    for r in rows:
        d = r["date"]
        agg[d] = agg.get(d, 0) + r["revenue"]

    sorted_dates = sorted(agg.keys())
    actuals = [{"date": d, "revenue": round(agg[d], 2), "forecast": None} for d in sorted_dates]

    # 7-day rolling average for forecast
    window = 7
    if len(actuals) >= window:
        rolling_avg = round(sum(agg[d] for d in sorted_dates[-window:]) / window, 2)
    else:
        rolling_avg = round(sum(agg[d] for d in sorted_dates) / max(len(sorted_dates), 1), 2)

    # Project `days_ahead` future points
    last_date = _date.fromisoformat(sorted_dates[-1])
    future = []
    for i in range(1, days_ahead + 1):
        fd = (last_date + timedelta(days=i)).isoformat()
        future.append({"date": fd, "revenue": None, "forecast": rolling_avg})

    return {
        "store_filter": store_name,
        "rolling_avg": rolling_avg,
        "data": actuals + future,
    }


def get_day_of_week_breakdown(store_name: Optional[str] = None, period: str = "this_year", metric: str = "revenue"):
    """Return average revenue or order count broken down by day of week (Mon–Sun)."""
    from datetime import date as _date
    store_id = _resolve_store_id(store_name)
    start, end = _resolve_period(period)
    rows = _filter_daily(store_id, start, end)

    DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    agg = {d: {"revenue": 0.0, "order_count": 0, "count": 0} for d in DAY_NAMES}

    for r in rows:
        dow = _date.fromisoformat(r["date"]).weekday()  # 0=Mon, 6=Sun
        day = DAY_NAMES[dow]
        agg[day]["revenue"] += r["revenue"]
        agg[day]["order_count"] += r["order_count"]
        agg[day]["count"] += 1

    data = []
    for day in DAY_NAMES:
        n = agg[day]["count"]
        data.append({
            "day": day,
            "avg_revenue": round(agg[day]["revenue"] / n, 2) if n else 0,
            "avg_orders": round(agg[day]["order_count"] / n, 1) if n else 0,
        })

    return {
        "period": f"{start} to {end}",
        "store_filter": store_name,
        "metric": metric,
        "data": data,
    }


def get_store_product_comparison(product_name: str, period: str = "this_year"):
    """Compare how a specific product performs across all stores."""
    start, end = _resolve_period(period)
    start_month = start[:7]
    end_month = end[:7]

    rows = [r for r in PRODUCT_SALES
            if r["product_name"].lower() == product_name.lower().strip()
            and start_month <= r["month"] <= end_month]

    if not rows:
        rows = [r for r in PRODUCT_SALES
                if product_name.lower().strip() in r["product_name"].lower()
                and start_month <= r["month"] <= end_month]

    agg = {}
    for r in rows:
        s = r["store_name"]
        if s not in agg:
            agg[s] = {"revenue": 0, "quantity": 0}
        agg[s]["revenue"] += r["revenue"]
        agg[s]["quantity"] += r["quantity"]

    data = sorted(
        [{"store": s, "revenue": round(v["revenue"], 2), "quantity": v["quantity"]} for s, v in agg.items()],
        key=lambda x: -x["revenue"]
    )

    matched_name = rows[0]["product_name"] if rows else product_name

    return {
        "product_name": matched_name,
        "period": f"{start_month} to {end_month}",
        "data": data,
    }


# ---------------------------------------------------------------------------
# Dispatcher — called from claude_service
# ---------------------------------------------------------------------------

TOOL_FUNCTIONS = {
    "get_revenue": get_revenue,
    "get_top_products": get_top_products,
    "get_peak_hours": get_peak_hours,
    "get_store_comparison": get_store_comparison,
    "get_order_count": get_order_count,
    "get_average_order_value": get_average_order_value,
    "get_kpi_summary": get_kpi_summary,
    "get_product_trend": get_product_trend,
    "get_category_breakdown": get_category_breakdown,
    "get_store_product_comparison": get_store_product_comparison,
    "get_day_of_week_breakdown": get_day_of_week_breakdown,
    "get_revenue_forecast": get_revenue_forecast,
}


def dispatch(tool_name: str, tool_input: dict):
    fn = TOOL_FUNCTIONS.get(tool_name)
    if not fn:
        return {"error": f"Unknown tool: {tool_name}"}
    try:
        return fn(**tool_input)
    except Exception as e:
        return {"error": str(e)}
