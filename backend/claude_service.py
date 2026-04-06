import os
import json
import anthropic
from tools import dispatch

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

MODEL = "claude-sonnet-4-6"

PERIOD_DESC = (
    "Period: last_7_days, last_30_days, last_90_days, this_year, "
    "month name (january..december), quarter (q1..q4), "
    "or exact range as 'YYYY-MM-DD to YYYY-MM-DD'"
)

SYSTEM_PROMPT = """You are a sharp analytics assistant for a coffee brand with two datasets:

━━━ DATASET 1 — Multi-Store Analytics (mock, 2025) ━━━
Stores: Downtown, Westside, Northgate, Eastpark, Midtown.
Data: daily sales across the full year 2025 (Jan–Dec).
Categories: Hot Drinks, Cold Drinks, Food.

━━━ DATASET 2 — Menu Profitability (real, Sola Olas 2024) ━━━
Single store "Sola Olas". Real 2024 data.
Categories: Beverages (26 items), Desserts (13 items), Breakfast (7 items).
Each item has: selling price (SAR), sales count, direct cost, app fee (23%), profit margin, margin %, annual profit, total revenue.
Notable items: بلاك كوفي (110k units), ice v60 (66k), وافل ستيك (38k), فرنش توست (32k).
Currency for menu data is SAR (Saudi Riyals). Always say "SAR" not "$" for menu data.

━━━ DATASET ROUTING — follow exactly ━━━
Use Dataset 2 tools (get_menu_items / get_menu_category_summary) when the question involves:
  • margin, profit, cost, app fee, direct cost, profitability
  • "menu item", "dish", "drink", "product" profitability or ranking by profit
  • "top [N] beverages/desserts/items" ranked by profit, margin, or cost
  • Sola Olas, SAR pricing, delivery app pricing
  DO NOT use get_top_products or get_revenue for these — they only have mock analytics data.

Use Dataset 1 tools (get_revenue, get_top_products, etc.) ONLY when the question involves:
  • specific store names: Downtown, Westside, Northgate, Eastpark, Midtown
  • revenue/orders over time, daily/monthly trends, period comparisons
  • peak hours, store comparisons, order counts

When in doubt (e.g. "top beverages by profit") → use Dataset 2 (menu tools).

━━━ CRITICAL RULES ━━━
- You HAVE margin, cost, and profit data. ALWAYS call the menu tools for profitability questions.
  NEVER say you lack cost or margin data — get_menu_items has it all.
- Lead with the key finding — be concise.
- Use SAR for menu data. Use $ for multi-store analytics data.
- Be proactive: flag anomalies or interesting patterns you notice.
- You MUST include a <chart_spec> block for ANY answer that contains quantitative data.
  The only exceptions: user explicitly asks for text only, or the answer is a single scalar number.

━━━ CHART TYPE RULES — follow exactly ━━━
Use these rules to pick the chart type — do not deviate:

• hbar     → Named categories with NO time component: top products, store rankings,
             category breakdowns, any "which X is highest" question.
             xKey = label field ("product","store","category"), yKey = numeric field.

• line     → Time-series trend shape matters: daily/monthly revenue, order counts.
             xKey = "date" or "month".

• area     → Time-series volume emphasis: full-year revenue, 90+ day ranges.

• bar      → Side-by-side multi-metric on categorical axis. Use when yKey is an array.

• pie      → Proportional breakdown ≤ 6 segments. Use nameKey + valueKey (no xKey/yKey).

• composed → Bar + line OVERLAY on the same chart. Perfect for revenue (bars) with
             order count trend (line) on a dual axis. Use barKeys=["revenue"] and
             lineKeys=["order_count"]. Both share xKey for the time axis.

• radar    → Multi-metric comparison across categories on a spider/web chart.
             Best for comparing stores across multiple KPIs simultaneously.
             Use angleKey for the spoke labels (e.g. "metric"), yKey for series.
             Data format: [{metric:"Revenue", Downtown:45000, Westside:38000,...}, ...]
             with one object per metric and store names as series in yKey.

• scatter  → Correlation between two numeric metrics. Each point is one entity (store/product).
             xKey = x-axis metric, yKey = y-axis metric, nameKey = point label.
             Optional zKey for bubble size. Good for AOV vs order_count by store.

• treemap  → Hierarchical area chart where box size = value. Great for product/category
             revenue proportions. Use nameKey for labels, valueKey for box size.
             Data: [{name:"Latte", value:45000}, ...] — flat array, no nesting.

━━━ MULTI-SERIES CHARTS ━━━
When comparing two metrics over time (e.g. "show revenue and orders by month"):
1. Call the relevant tools separately.
2. Merge results by the shared time key into one data array.
   Each object must contain ALL keys referenced in yKey/barKeys/lineKeys.
3. For composed: set barKeys=["revenue"], lineKeys=["order_count"], xKey="month".
4. Never reference fields that don't exist in every data object.

━━━ CHART SPEC FORMAT ━━━
Output the chart spec AFTER your text response, inside these exact tags:
<chart_spec>
{
  "dataset": "menu"|"analytics",
  "type": "hbar"|"line"|"area"|"bar"|"pie"|"composed"|"radar"|"scatter"|"treemap",
  "title": "Descriptive chart title",
  "xKey": "field for x-axis or category label",
  "yKey": "field for y-axis" or ["field1","field2"],
  "angleKey": "field for radar spoke labels (radar only)",
  "barKeys": ["field1"],
  "lineKeys": ["field2"],
  "nameKey": "label field (pie/scatter/treemap)",
  "valueKey": "value field (pie/treemap)",
  "zKey": "bubble size field (scatter, optional)",
  "data": [...],
  "colors": ["#D4AF37","#E8C84A","#B8960C"]
}
</chart_spec>
Always include "dataset": set to "menu" when using get_menu_items/get_menu_category_summary data, "analytics" for all other tools.
Only include the other keys relevant to the chart type you are using.

━━━ TOOL USAGE GUIDE ━━━
- get_product_trend    → single product's performance over months or by store
- get_category_breakdown → Hot Drinks vs Cold Drinks vs Food comparison
- get_store_product_comparison → which store sells the most of a given product
- get_store_comparison → overall store rankings on any metric
- get_top_products     → which products lead in revenue or units
- get_revenue / get_order_count / get_average_order_value → time-series metrics
- get_kpi_summary      → high-level totals with period-over-period change
- get_day_of_week_breakdown → avg revenue/orders by Mon-Sun, great for bar charts
- get_revenue_forecast → last 30 days actual revenue + 7-day rolling average projection
- get_menu_items → menu profitability data; filter by category, sort by any metric
- get_menu_category_summary → aggregate stats per category (Beverages/Desserts/Breakfast)

━━━ CLARIFICATION ━━━
If the user's request is genuinely ambiguous — unclear which metric to show, which time range, or which chart type fits — ask ONE short clarifying question BEFORE calling any tools. Do NOT output a <chart_spec> for clarification messages. Use <suggestions> to offer 2–4 specific options the user can click to answer your question.
Examples that need clarification: "show me a chart", "visualize the data", "make a graph", "chart it".
Examples that do NOT need clarification: "top 5 products by profit", "monthly revenue line chart", "compare stores".
When clarifying, be specific: name the choices (e.g. "Do you want a bar chart by profit, or a pie chart by category share?").

━━━ OUTPUT FORMAT — TABLES ━━━
When presenting ranked lists or comparisons with 3+ fields, use a Markdown table instead of a bullet list.
Always include a <chart_spec> alongside the table for the same data.

━━━ FOLLOW-UP SUGGESTIONS ━━━
After every response, output 2–3 short follow-up question suggestions the user might naturally ask next.
Format them as a JSON array inside these exact tags (after the chart_spec block if present):
<suggestions>["Question 1?", "Question 2?", "Question 3?"]</suggestions>
Keep suggestions short (under 50 chars each) and relevant to what was just shown.
"""

TOOLS = [
    {
        "name": "get_revenue",
        "description": "Get revenue data over time, optionally filtered by store and period. Use group_by='day' for daily trends, 'month' for monthly overview, 'store' for store comparison.",
        "input_schema": {
            "type": "object",
            "properties": {
                "store_name": {"type": "string", "description": "Store name (Downtown, Westside, Northgate, Eastpark, Midtown) or omit for all stores"},
                "period": {"type": "string", "description": PERIOD_DESC},
                "group_by": {"type": "string", "enum": ["day", "month", "store"], "description": "How to group the results"}
            },
            "required": []
        }
    },
    {
        "name": "get_top_products",
        "description": "Get top-selling products by revenue or quantity from the MOCK multi-store 2025 analytics data only. Do NOT use for margin, cost, or profitability questions — use get_menu_items instead.",
        "input_schema": {
            "type": "object",
            "properties": {
                "store_name": {"type": "string", "description": "Store name or omit for all stores"},
                "period": {"type": "string", "description": PERIOD_DESC},
                "limit": {"type": "integer", "description": "Number of top products to return (default 10)"},
                "metric": {"type": "string", "enum": ["revenue", "quantity"], "description": "Sort by revenue or quantity sold"}
            },
            "required": []
        }
    },
    {
        "name": "get_peak_hours",
        "description": "Get average order count by hour of day to identify peak traffic times.",
        "input_schema": {
            "type": "object",
            "properties": {
                "store_name": {"type": "string", "description": "Store name or omit for all stores"},
                "day_type": {"type": "string", "enum": ["weekday", "weekend"], "description": "Weekday or weekend pattern"}
            },
            "required": []
        }
    },
    {
        "name": "get_store_comparison",
        "description": "Compare all stores on a given metric (revenue, order_count, avg_order_value).",
        "input_schema": {
            "type": "object",
            "properties": {
                "metric": {"type": "string", "enum": ["revenue", "order_count", "avg_order_value"], "description": "Metric to compare"},
                "period": {"type": "string", "description": PERIOD_DESC}
            },
            "required": []
        }
    },
    {
        "name": "get_order_count",
        "description": "Get total number of orders over time.",
        "input_schema": {
            "type": "object",
            "properties": {
                "store_name": {"type": "string", "description": "Store name or omit for all stores"},
                "period": {"type": "string", "description": PERIOD_DESC},
                "group_by": {"type": "string", "enum": ["day", "month", "store"]}
            },
            "required": []
        }
    },
    {
        "name": "get_average_order_value",
        "description": "Get average order value (revenue per order) trend.",
        "input_schema": {
            "type": "object",
            "properties": {
                "store_name": {"type": "string", "description": "Store name or omit for all stores"},
                "period": {"type": "string", "description": PERIOD_DESC},
                "group_by": {"type": "string", "enum": ["month", "store"], "description": "Group by month trend or by store"}
            },
            "required": []
        }
    },
    {
        "name": "get_kpi_summary",
        "description": "Get a high-level KPI summary: total revenue, total orders, AOV, best store, and period-over-period changes.",
        "input_schema": {
            "type": "object",
            "properties": {
                "period": {"type": "string", "description": PERIOD_DESC}
            },
            "required": []
        }
    },
    {
        "name": "get_product_trend",
        "description": "Get sales trend for a specific product — over time (group_by=month) or broken down by store (group_by=store). Use when user asks about a single product's performance.",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_name": {"type": "string", "description": "Product name e.g. Latte, Cold Brew, Espresso, Croissant"},
                "period": {"type": "string", "description": PERIOD_DESC},
                "group_by": {"type": "string", "enum": ["month", "store"], "description": "Monthly trend or per-store breakdown"}
            },
            "required": ["product_name"]
        }
    },
    {
        "name": "get_category_breakdown",
        "description": "Get revenue and quantity broken down by category: Hot Drinks, Cold Drinks, Food. Use when user asks how categories compare.",
        "input_schema": {
            "type": "object",
            "properties": {
                "period": {"type": "string", "description": PERIOD_DESC},
                "store_name": {"type": "string", "description": "Store name or omit for all stores"}
            },
            "required": []
        }
    },
    {
        "name": "get_menu_items",
        "description": "ALWAYS call this for margin/profit/cost questions. Returns REAL 2024 data for Sola Olas menu items with profit_margin_pct, direct_cost, app_fee, annual_profit, selling_price, sales_count. Call this when user asks: 'which item has highest margin', 'top beverages by profit', 'most profitable item', 'what are item costs', 'which dessert earns the most', 'menu profitability', 'cost breakdown'. This tool HAS the margin and cost data — do not say you lack it.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "enum": ["Beverages", "Desserts", "Breakfast"], "description": "Filter by category, or omit for all"},
                "sort_by": {"type": "string", "enum": ["annual_profit", "sales_count", "revenue", "profit_margin_pct", "selling_price", "profit_margin"], "description": "Field to sort by descending (default: annual_profit)"},
                "limit": {"type": "integer", "description": "Max items to return (default 20)"},
                "min_margin_pct": {"type": "number", "description": "Only return items with margin % >= this value"}
            },
            "required": []
        }
    },
    {
        "name": "get_menu_category_summary",
        "description": "Call this for category-level profit comparisons. Returns total annual profit, total revenue, avg margin %, item count per category (Beverages/Desserts/Breakfast). Use when user asks: 'which category is most profitable', 'compare categories by margin', 'how do beverages compare to desserts'.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "get_revenue_forecast",
        "description": "Get last 30 days of daily revenue plus a 7-day rolling average forecast projected into the future. Use when user asks about forecast, prediction, projection, or 'what will revenue look like'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "store_name": {"type": "string", "description": "Store name or omit for all stores"},
                "days_ahead": {"type": "integer", "description": "How many days to project into the future (default 7)"}
            },
            "required": []
        }
    },
    {
        "name": "get_day_of_week_breakdown",
        "description": "Get average revenue and average order count broken down by day of week (Monday through Sunday). Use when user asks about which days are busiest, day-of-week patterns, or weekday vs weekend comparisons at a granular level.",
        "input_schema": {
            "type": "object",
            "properties": {
                "store_name": {"type": "string", "description": "Store name or omit for all stores"},
                "period": {"type": "string", "description": PERIOD_DESC},
                "metric": {"type": "string", "enum": ["revenue", "order_count"], "description": "Primary metric to highlight"}
            },
            "required": []
        }
    },
    {
        "name": "get_store_product_comparison",
        "description": "Compare how one specific product performs across all 5 stores — revenue and quantity per store. Use for 'which store sells the most X' questions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_name": {"type": "string", "description": "Product name e.g. Latte, Cold Brew, Espresso"},
                "period": {"type": "string", "description": PERIOD_DESC}
            },
            "required": ["product_name"]
        }
    },
]


def parse_chart_spec(text: str):
    """Extract chart_spec JSON from Claude's text response."""
    import re
    match = re.search(r"<chart_spec>(.*?)</chart_spec>", text, re.DOTALL)
    if match:
        try:
            chart_spec = json.loads(match.group(1).strip())
            clean_text = re.sub(r"<chart_spec>.*?</chart_spec>", "", text, flags=re.DOTALL).strip()
            return clean_text, chart_spec
        except json.JSONDecodeError:
            pass
    return text, None


def parse_suggestions(text: str):
    """Extract follow-up suggestions JSON array from Claude's text response."""
    import re
    match = re.search(r"<suggestions>(.*?)</suggestions>", text, re.DOTALL)
    if match:
        try:
            suggestions = json.loads(match.group(1).strip())
            clean_text = re.sub(r"<suggestions>.*?</suggestions>", "", text, flags=re.DOTALL).strip()
            return clean_text, suggestions
        except (json.JSONDecodeError, ValueError):
            pass
    return text, []


MENU_KEYWORDS = [
    "margin", "profit", "cost", "profitable", "profitability",
    "menu item", "app fee", "direct cost", "sar", "sola olas",
    "highest margin", "most profitable", "top item", "top beverage",
    "top dessert", "top breakfast", "which item", "best item",
    "earning", "annual profit", "lowest cost",
]


def _is_menu_question(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in MENU_KEYWORDS)


def chat(messages: list) -> dict:
    """
    Run a multi-turn conversation with tool use.
    messages: list of {"role": "user"|"assistant", "content": str}
    Returns: {"text": str, "chart_spec": dict | None}
    """
    api_messages = [{"role": m["role"], "content": m["content"]} for m in messages]

    # Anthropic requires the first message to be from "user"
    while api_messages and api_messages[0]["role"] != "user":
        api_messages.pop(0)

    if not api_messages:
        return {"text": "Please send a message to get started.", "chart_spec": None, "suggestions": []}

    # Detect if the last user message is menu-related and force tool use
    force_menu_tool = False
    if api_messages and api_messages[-1]["role"] == "user":
        if _is_menu_question(api_messages[-1]["content"]):
            force_menu_tool = True

    first_call = True
    while True:
        kwargs = dict(
            model=MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=api_messages,
        )
        # On the first call, force the correct tool if it's a menu question
        if first_call and force_menu_tool:
            kwargs["tool_choice"] = {"type": "tool", "name": "get_menu_items"}
        first_call = False

        response = client.messages.create(**kwargs)

        # No tool use — return final text
        if response.stop_reason == "end_turn":
            full_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    full_text += block.text
            text, chart_spec = parse_chart_spec(full_text)
            text, suggestions = parse_suggestions(text)
            return {"text": text, "chart_spec": chart_spec, "suggestions": suggestions}

        # Tool use — execute tools and continue
        if response.stop_reason == "tool_use":
            api_messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = dispatch(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    })

            api_messages.append({"role": "user", "content": tool_results})
            continue

        break

    return {"text": "I encountered an issue processing your request.", "chart_spec": None, "suggestions": []}


def chat_stream(messages: list):
    """
    Streaming version of chat(). Yields SSE events:
      data: {"type": "text", "text": "<chunk>"}
      data: {"type": "done", "text": "<full>", "chart_spec": <obj|null>, "suggestions": [...]}
    """
    import json as _json

    api_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
    while api_messages and api_messages[0]["role"] != "user":
        api_messages.pop(0)
    if not api_messages:
        yield 'data: {"type":"done","text":"Please send a message.","chart_spec":null,"suggestions":[]}\n\n'
        return

    force_menu_tool = False
    if api_messages and api_messages[-1]["role"] == "user":
        if _is_menu_question(api_messages[-1]["content"]):
            force_menu_tool = True

    # ── Tool-use loop (identical to chat()) ─────────────────────────────────
    first_call = True
    while True:
        kwargs = dict(model=MODEL, max_tokens=4096, system=SYSTEM_PROMPT, tools=TOOLS, messages=api_messages)
        if first_call and force_menu_tool:
            kwargs["tool_choice"] = {"type": "tool", "name": "get_menu_items"}
        first_call = False

        response = client.messages.create(**kwargs)

        if response.stop_reason == "end_turn":
            full_text = "".join(b.text for b in response.content if hasattr(b, "text"))

            # Stream the final text character-by-character in chunks
            chunk_size = 4
            for i in range(0, len(full_text), chunk_size):
                chunk = full_text[i:i + chunk_size]
                yield f"data: {_json.dumps({'type': 'text', 'text': chunk})}\n\n"

            # Parse and send the done event with clean text + chart_spec + suggestions
            clean, chart_spec = parse_chart_spec(full_text)
            clean, suggestions = parse_suggestions(clean)
            yield f"data: {_json.dumps({'type': 'done', 'text': clean, 'chart_spec': chart_spec, 'suggestions': suggestions})}\n\n"
            return

        if response.stop_reason == "tool_use":
            api_messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = dispatch(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": _json.dumps(result),
                    })
            api_messages.append({"role": "user", "content": tool_results})
            continue

        break

    yield 'data: {"type":"done","text":"I encountered an issue.","chart_spec":null,"suggestions":[]}\n\n'
