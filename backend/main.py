import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import claude_service
import tools

app = FastAPI(title="Coffee Co. Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Static data endpoints (used by the default dashboard charts)
# ---------------------------------------------------------------------------

@app.get("/api/stores")
def get_stores():
    return tools.STORES


@app.get("/api/products")
def get_products():
    return tools.PRODUCTS


@app.get("/api/kpi-summary")
def kpi_summary(period: str = "last_30_days"):
    return tools.get_kpi_summary(period)


@app.get("/api/revenue")
def revenue(store_name: Optional[str] = None, period: str = "last_30_days", group_by: str = "day"):
    return tools.get_revenue(store_name, period, group_by)


@app.get("/api/top-products")
def top_products(store_name: Optional[str] = None, period: str = "last_30_days", limit: int = 10, metric: str = "revenue"):
    return tools.get_top_products(store_name, period, limit, metric)


@app.get("/api/peak-hours")
def peak_hours(store_name: Optional[str] = None, day_type: str = "weekday"):
    return tools.get_peak_hours(store_name, day_type)


@app.get("/api/store-comparison")
def store_comparison(metric: str = "revenue", period: str = "last_30_days"):
    return tools.get_store_comparison(metric, period)


@app.get("/api/day-of-week")
def day_of_week(store_name: Optional[str] = None, period: str = "this_year", metric: str = "revenue"):
    return tools.get_day_of_week_breakdown(store_name, period, metric)


@app.get("/api/revenue-forecast")
def revenue_forecast(store_name: Optional[str] = None, days_ahead: int = 7):
    return tools.get_revenue_forecast(store_name, days_ahead)


@app.get("/api/menu")
def menu_items(category: Optional[str] = None):
    import json, os
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "menu_data.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if category:
        data = [d for d in data if d["category"].lower() == category.lower()]
    return data


# ---------------------------------------------------------------------------
# Chat endpoint
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    messages: list  # [{"role": "user"|"assistant", "content": str}, ...]


@app.post("/api/chat")
def chat(req: ChatRequest):
    try:
        result = claude_service.chat(req.messages)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat-stream")
def chat_stream(req: ChatRequest):
    return StreamingResponse(
        claude_service.chat_stream(req.messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
