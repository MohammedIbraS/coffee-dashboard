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

SYSTEM_PROMPT = """You are a sharp analytics assistant for Coffee Co., a multi-store coffee chain.
You help users explore sales data through natural conversation, spotting trends and generating charts.

Available stores: Downtown, Westside, Northgate, Eastpark, Midtown.
Data covers the full year 2025 (Jan–Dec).
Product categories: Hot Drinks, Cold Drinks, Food.

━━━ RESPONSE RULES ━━━
- Lead with the key finding — be concise.
- Always use $ and commas for revenue values (e.g. $12,450).
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
Only include the keys relevant to the chart type you are using.

━━━ TOOL USAGE GUIDE ━━━
- get_product_trend    → single product's performance over months or by store
- get_category_breakdown → Hot Drinks vs Cold Drinks vs Food comparison
- get_store_product_comparison → which store sells the most of a given product
- get_store_comparison → overall store rankings on any metric
- get_top_products     → which products lead in revenue or units
- get_revenue / get_order_count / get_average_order_value → time-series metrics
- get_kpi_summary      → high-level totals with period-over-period change
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
        "description": "Get top-selling products by revenue or quantity.",
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
        return {"text": "Please send a message to get started.", "chart_spec": None}

    while True:
        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=api_messages,
        )

        # No tool use — return final text
        if response.stop_reason == "end_turn":
            full_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    full_text += block.text
            text, chart_spec = parse_chart_spec(full_text)
            return {"text": text, "chart_spec": chart_spec}

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

    return {"text": "I encountered an issue processing your request.", "chart_spec": None}
