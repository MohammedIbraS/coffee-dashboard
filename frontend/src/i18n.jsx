import { createContext, useContext, useState } from "react";

export const translations = {
  en: {
    // Tabs
    tabAnalytics: "☕ Analytics",
    tabMenu: "📋 Menu Profitability",

    // Dashboard header
    brandName: "Coffee Co.",
    brandTag: "Analytics",

    // Period pills
    p7D: "7D", p30D: "30D", p90D: "90D", pYTD: "YTD",
    periodPrefix: "Period:",

    // KPI cards
    kpiRevenue: "Total Revenue",
    kpiOrders: "Total Orders",
    kpiAOV: "Avg Order Value",
    kpiTopStore: "Top Store",
    kpiRevenueSub: "All stores combined",
    kpiOrdersSub: "Across all locations",
    kpiAOVSub: "Revenue per transaction",

    // Chart titles / subtitles
    chartRevenue: "Revenue Over Time",
    chartTopProducts: "Top Products",
    chartTopProductsSub: "By revenue",
    chartPeakHours: "Peak Hours",
    chartPeakHoursSub: "Average orders by hour",
    chartStoreComp: "Store Comparison",
    chartStoreCompSub: "Performance across all locations",
    chartDOW: "Day of Week",
    chartDOWSub: "Average performance by weekday",
    chartForecast: "Revenue Forecast",
    chartForecastSub: "Last 30 days + 7-day rolling average projection",

    // Controls
    weekday: "Weekday", weekend: "Weekend",
    revenue: "Revenue", orders: "Orders", aov: "AOV",

    // Menu dashboard
    menuBrandName: "Menu Profitability",
    menuBrandTag: "Sola Olas · 2024",
    menuKpiRevenue: "Total Annual Revenue",
    menuKpiProfit: "Total Annual Profit",
    menuKpiBestSeller: "Best Seller",
    menuKpiHighestMargin: "Highest Margin",
    menuKpiRevenueSub: "All menu items",
    menuKpiProfitSub: "After costs & fees",
    menuUnitsSold: "units sold",
    menuMarginSuffix: "margin",
    menuSortBy: "Sort by:",
    menuSortProfit: "Annual Profit",
    menuSortVolume: "Sales Volume",
    menuSortRevenue: "Revenue",
    menuSortMargin: "Margin %",
    menuCatAll: "All",
    menuChartTop: "Top Items",
    menuChartTopSub: "Sorted by",
    menuChartTopSub2: "top 15",
    menuChartPie: "Profit by Category",
    menuChartPieSub: "Annual profit share",
    menuChartScatter: "Margin % vs Sales Volume",
    menuChartScatterSub: "Bubble size = revenue",
    menuChartTable: "Cost Breakdown",
    menuChartTableSub: "Direct cost · App fee (23%) · Profit per unit",

    // Table headers
    thItem: "Item", thCategory: "Category", thPrice: "Price",
    thDirectCost: "Direct Cost", thAppFee: "App Fee",
    thProfitUnit: "Profit/Unit", thMargin: "Margin %",
    thUnits: "Units Sold", thAnnualProfit: "Annual Profit",

    // Chat
    chatTitle: "AI Assistant",
    chatPlaceholder: "Ask anything...",
    chatClear: "Clear",

    // Settings
    langToggle: "عربي",
    themeLight: "☀️",
    themeDark: "🌙",
  },

  ar: {
    // Tabs
    tabAnalytics: "☕ التحليلات",
    tabMenu: "📋 ربحية المنيو",

    // Dashboard header
    brandName: "كوفي كو.",
    brandTag: "تحليلات",

    // Period pills
    p7D: "٧ أيام", p30D: "٣٠ يوم", p90D: "٩٠ يوم", pYTD: "هذا العام",
    periodPrefix: "الفترة:",

    // KPI cards
    kpiRevenue: "إجمالي الإيرادات",
    kpiOrders: "إجمالي الطلبات",
    kpiAOV: "متوسط قيمة الطلب",
    kpiTopStore: "أفضل فرع",
    kpiRevenueSub: "جميع الفروع",
    kpiOrdersSub: "عبر جميع المواقع",
    kpiAOVSub: "الإيراد لكل معاملة",

    // Chart titles / subtitles
    chartRevenue: "الإيرادات عبر الزمن",
    chartTopProducts: "أفضل المنتجات",
    chartTopProductsSub: "حسب الإيراد",
    chartPeakHours: "ساعات الذروة",
    chartPeakHoursSub: "متوسط الطلبات بالساعة",
    chartStoreComp: "مقارنة الفروع",
    chartStoreCompSub: "الأداء عبر جميع الفروع",
    chartDOW: "أيام الأسبوع",
    chartDOWSub: "متوسط الأداء حسب اليوم",
    chartForecast: "توقعات الإيرادات",
    chartForecastSub: "آخر ٣٠ يوم + توقعات متوسط ٧ أيام",

    // Controls
    weekday: "أيام العمل", weekend: "نهاية الأسبوع",
    revenue: "الإيراد", orders: "الطلبات", aov: "متوسط الطلب",

    // Menu dashboard
    menuBrandName: "ربحية المنيو",
    menuBrandTag: "سولا أولاس · ٢٠٢٤",
    menuKpiRevenue: "إجمالي الإيرادات السنوية",
    menuKpiProfit: "إجمالي الأرباح السنوية",
    menuKpiBestSeller: "الأكثر مبيعاً",
    menuKpiHighestMargin: "أعلى هامش ربح",
    menuKpiRevenueSub: "جميع أصناف المنيو",
    menuKpiProfitSub: "بعد التكاليف والرسوم",
    menuUnitsSold: "وحدة مباعة",
    menuMarginSuffix: "هامش",
    menuSortBy: "ترتيب حسب:",
    menuSortProfit: "الربح السنوي",
    menuSortVolume: "حجم المبيعات",
    menuSortRevenue: "الإيراد",
    menuSortMargin: "نسبة الهامش",
    menuCatAll: "الكل",
    menuChartTop: "أفضل الأصناف",
    menuChartTopSub: "مرتب حسب",
    menuChartTopSub2: "أفضل ١٥",
    menuChartPie: "الربح حسب الفئة",
    menuChartPieSub: "حصة الربح السنوي",
    menuChartScatter: "الهامش مقابل حجم المبيعات",
    menuChartScatterSub: "حجم الفقاعة = الإيراد",
    menuChartTable: "تفصيل التكاليف",
    menuChartTableSub: "التكلفة المباشرة · رسوم التطبيق (٢٣٪) · الربح للوحدة",

    // Table headers
    thItem: "الصنف", thCategory: "الفئة", thPrice: "السعر",
    thDirectCost: "التكلفة المباشرة", thAppFee: "رسوم التطبيق",
    thProfitUnit: "الربح/الوحدة", thMargin: "نسبة الهامش",
    thUnits: "الوحدات المباعة", thAnnualProfit: "الربح السنوي",

    // Chat
    chatTitle: "المساعد الذكي",
    chatPlaceholder: "اسأل أي شيء...",
    chatClear: "مسح",

    // Settings
    langToggle: "English",
    themeLight: "☀️",
    themeDark: "🌙",
  },
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState("en");
  const t = translations[lang];
  const isRTL = lang === "ar";
  const toggleLang = () => setLang((l) => (l === "en" ? "ar" : "en"));
  return (
    <LangContext.Provider value={{ lang, t, isRTL, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
