import json
import random
from datetime import date, timedelta

random.seed(42)

STORES = [
    {"id": "store_1", "name": "Downtown", "district": "Downtown"},
    {"id": "store_2", "name": "Westside", "district": "Westside"},
    {"id": "store_3", "name": "Northgate", "district": "Northgate"},
    {"id": "store_4", "name": "Eastpark", "district": "Eastpark"},
    {"id": "store_5", "name": "Midtown", "district": "Midtown"},
]

PRODUCTS = [
    {"id": "espresso",       "name": "Espresso",       "category": "Hot Drinks",  "price": 3.50},
    {"id": "americano",      "name": "Americano",      "category": "Hot Drinks",  "price": 4.00},
    {"id": "cappuccino",     "name": "Cappuccino",     "category": "Hot Drinks",  "price": 4.50},
    {"id": "latte",          "name": "Latte",          "category": "Hot Drinks",  "price": 5.00},
    {"id": "flat_white",     "name": "Flat White",     "category": "Hot Drinks",  "price": 5.00},
    {"id": "mocha",          "name": "Mocha",          "category": "Hot Drinks",  "price": 5.50},
    {"id": "macchiato",      "name": "Macchiato",      "category": "Hot Drinks",  "price": 4.50},
    {"id": "cortado",        "name": "Cortado",        "category": "Hot Drinks",  "price": 4.00},
    {"id": "pour_over",      "name": "Pour Over",      "category": "Hot Drinks",  "price": 5.00},
    {"id": "hot_chocolate",  "name": "Hot Chocolate",  "category": "Hot Drinks",  "price": 4.50},
    {"id": "cold_brew",      "name": "Cold Brew",      "category": "Cold Drinks", "price": 5.50},
    {"id": "iced_latte",     "name": "Iced Latte",     "category": "Cold Drinks", "price": 5.50},
    {"id": "iced_americano", "name": "Iced Americano", "category": "Cold Drinks", "price": 4.50},
    {"id": "matcha_latte",   "name": "Matcha Latte",   "category": "Cold Drinks", "price": 5.50},
    {"id": "chai_latte",     "name": "Chai Latte",     "category": "Cold Drinks", "price": 5.00},
    {"id": "croissant",      "name": "Croissant",      "category": "Food",        "price": 3.50},
    {"id": "muffin",         "name": "Muffin",         "category": "Food",        "price": 3.00},
    {"id": "avocado_toast",  "name": "Avocado Toast",  "category": "Food",        "price": 8.00},
    {"id": "banana_bread",   "name": "Banana Bread",   "category": "Food",        "price": 3.50},
    {"id": "cheesecake",     "name": "Cheesecake",     "category": "Food",        "price": 5.00},
]

# Base daily orders per store (some stores busier than others)
STORE_BASE_ORDERS = {
    "store_1": 180,  # Downtown busiest
    "store_2": 140,
    "store_3": 120,
    "store_4": 130,
    "store_5": 160,
}

# Product popularity weights (sum doesn't need to equal 1)
PRODUCT_WEIGHTS = {
    "espresso": 0.10,
    "americano": 0.09,
    "cappuccino": 0.10,
    "latte": 0.13,
    "flat_white": 0.07,
    "mocha": 0.06,
    "macchiato": 0.05,
    "cortado": 0.04,
    "pour_over": 0.04,
    "hot_chocolate": 0.03,
    "cold_brew": 0.07,
    "iced_latte": 0.08,
    "iced_americano": 0.04,
    "matcha_latte": 0.04,
    "chai_latte": 0.03,
    "croissant": 0.05,
    "muffin": 0.04,
    "avocado_toast": 0.03,
    "banana_bread": 0.04,
    "cheesecake": 0.03,
}

# Peak hours distribution (orders weight by hour)
HOUR_WEIGHTS = {
    6: 0.02, 7: 0.08, 8: 0.14, 9: 0.13, 10: 0.08,
    11: 0.07, 12: 0.09, 13: 0.08, 14: 0.07, 15: 0.07,
    16: 0.06, 17: 0.05, 18: 0.04, 19: 0.02, 20: 0.01,
}


def seasonal_multiplier(month):
    """Hot months (summer) boost cold drinks, winter boosts hot drinks. Overall traffic stable."""
    base = {1: 1.05, 2: 1.03, 3: 1.0, 4: 1.02, 5: 1.05,
            6: 1.08, 7: 1.10, 8: 1.09, 9: 1.04, 10: 1.03,
            11: 1.06, 12: 1.08}
    return base[month]


def day_of_week_multiplier(weekday):
    """0=Monday, 6=Sunday"""
    weights = {0: 1.0, 1: 1.0, 2: 1.02, 3: 1.03, 4: 1.05, 5: 0.90, 6: 0.85}
    return weights[weekday]


def cold_drink_weight(month, base_weight):
    """Cold drinks more popular in summer months."""
    summer_boost = {6: 1.5, 7: 1.7, 8: 1.6, 5: 1.3, 9: 1.2}
    winter_penalty = {12: 0.6, 1: 0.55, 2: 0.6, 11: 0.7}
    cold_ids = {"cold_brew", "iced_latte", "iced_americano", "matcha_latte", "chai_latte"}
    return base_weight


def generate_daily_sales():
    records = []
    start = date(2025, 1, 1)
    end = date(2025, 12, 31)
    current = start
    while current <= end:
        for store in STORES:
            sid = store["id"]
            base = STORE_BASE_ORDERS[sid]
            season = seasonal_multiplier(current.month)
            dow = day_of_week_multiplier(current.weekday())
            noise = random.uniform(0.88, 1.12)
            order_count = int(base * season * dow * noise)

            # Average order value varies slightly per store/day
            aov = round(random.uniform(6.80, 9.20), 2)
            revenue = round(order_count * aov, 2)

            records.append({
                "date": current.isoformat(),
                "store_id": sid,
                "store_name": store["name"],
                "order_count": order_count,
                "revenue": revenue,
                "avg_order_value": aov,
            })
        current += timedelta(days=1)
    return records


def generate_product_sales():
    records = []
    product_ids = [p["id"] for p in PRODUCTS]
    weights = [PRODUCT_WEIGHTS[pid] for pid in product_ids]

    for store in STORES:
        sid = store["id"]
        base = STORE_BASE_ORDERS[sid]

        for month in range(1, 13):
            days_in_month = 31 if month in [1,3,5,7,8,10,12] else (28 if month == 2 else 30)
            season = seasonal_multiplier(month)
            total_orders = int(base * season * days_in_month)

            for product in PRODUCTS:
                pid = product["id"]
                pw = PRODUCT_WEIGHTS[pid]

                # Seasonal cold/hot adjustment
                if product["category"] == "Cold Drinks":
                    if month in [6, 7, 8]:
                        pw *= 1.6
                    elif month in [12, 1, 2]:
                        pw *= 0.55

                if product["category"] == "Hot Drinks" and pid not in ["hot_chocolate"]:
                    if month in [12, 1, 2]:
                        pw *= 1.15
                    elif month in [6, 7, 8]:
                        pw *= 0.85

                qty = int(total_orders * pw * random.uniform(0.90, 1.10))
                revenue = round(qty * product["price"], 2)

                records.append({
                    "month": f"2025-{month:02d}",
                    "store_id": sid,
                    "store_name": store["name"],
                    "product_id": pid,
                    "product_name": product["name"],
                    "category": product["category"],
                    "price": product["price"],
                    "quantity": qty,
                    "revenue": revenue,
                })
    return records


def generate_hourly_data():
    records = []
    hours = list(HOUR_WEIGHTS.keys())
    for store in STORES:
        sid = store["id"]
        base = STORE_BASE_ORDERS[sid]
        for hour in hours:
            weight = HOUR_WEIGHTS[hour]
            # Weekday
            avg_orders_weekday = round(base * weight * random.uniform(0.92, 1.08), 1)
            # Weekend (morning rush smaller, afternoon larger)
            weekend_mod = 1.0
            if hour in [8, 9]:
                weekend_mod = 0.75
            elif hour in [11, 12, 13]:
                weekend_mod = 1.20
            avg_orders_weekend = round(base * 0.88 * weight * weekend_mod * random.uniform(0.92, 1.08), 1)

            records.append({
                "store_id": sid,
                "store_name": store["name"],
                "hour": hour,
                "avg_orders_weekday": avg_orders_weekday,
                "avg_orders_weekend": avg_orders_weekend,
            })
    return records


if __name__ == "__main__":
    import os
    out_dir = os.path.dirname(os.path.abspath(__file__))

    stores_path = os.path.join(out_dir, "stores.json")
    products_path = os.path.join(out_dir, "products.json")
    daily_path = os.path.join(out_dir, "daily_sales.json")
    product_sales_path = os.path.join(out_dir, "product_sales.json")
    hourly_path = os.path.join(out_dir, "hourly_data.json")

    with open(stores_path, "w") as f:
        json.dump(STORES, f, indent=2)
    print(f"Wrote {len(STORES)} stores")

    with open(products_path, "w") as f:
        json.dump(PRODUCTS, f, indent=2)
    print(f"Wrote {len(PRODUCTS)} products")

    daily = generate_daily_sales()
    with open(daily_path, "w") as f:
        json.dump(daily, f, indent=2)
    print(f"Wrote {len(daily)} daily sales records")

    product_sales = generate_product_sales()
    with open(product_sales_path, "w") as f:
        json.dump(product_sales, f, indent=2)
    print(f"Wrote {len(product_sales)} product sales records")

    hourly = generate_hourly_data()
    with open(hourly_path, "w") as f:
        json.dump(hourly, f, indent=2)
    print(f"Wrote {len(hourly)} hourly records")

    print("Done!")
