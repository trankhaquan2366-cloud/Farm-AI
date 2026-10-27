(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/frontend/app/(dashboard)/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DashboardPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__ = __turbopack_context__.i("[project]/frontend/node_modules/swr/dist/use-swr-emll9s78.mjs [app-client] (ecmascript) <export u as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sprout$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sprout$3e$__ = __turbopack_context__.i("[project]/frontend/node_modules/lucide-react/dist/esm/icons/sprout.mjs [app-client] (ecmascript) <export default as Sprout>");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layers$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Layers$3e$__ = __turbopack_context__.i("[project]/frontend/node_modules/lucide-react/dist/esm/icons/layers.mjs [app-client] (ecmascript) <export default as Layers>");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$leaf$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Leaf$3e$__ = __turbopack_context__.i("[project]/frontend/node_modules/lucide-react/dist/esm/icons/leaf.mjs [app-client] (ecmascript) <export default as Leaf>");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PackageCheck$3e$__ = __turbopack_context__.i("[project]/frontend/node_modules/lucide-react/dist/esm/icons/package-check.mjs [app-client] (ecmascript) <export default as PackageCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$components$2f$dashboard$2f$stat$2d$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/components/dashboard/stat-card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$components$2f$dashboard$2f$harvest$2d$chart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/components/dashboard/harvest-chart.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
function DashboardPage() {
    _s();
    const { data: plots, isLoading: loadingPlots } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"])('/api/plots', __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetcher"]);
    const { data: varieties, isLoading: loadingVarieties } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"])('/api/varieties', __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetcher"]);
    const { data: batches, isLoading: loadingBatches } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"])('/api/batches', __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetcher"]);
    const growingCount = batches?.filter((b)=>b.status === 'growing').length ?? 0;
    const harvestedCount = batches?.filter((b)=>b.status === 'harvested').length ?? 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mx-auto max-w-6xl space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$components$2f$dashboard$2f$stat$2d$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatCard"], {
                        label: "Lô đất",
                        value: plots?.length ?? 0,
                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layers$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Layers$3e$__["Layers"],
                        loading: loadingPlots
                    }, void 0, false, {
                        fileName: "[project]/frontend/app/(dashboard)/page.tsx",
                        lineNumber: 30,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$components$2f$dashboard$2f$stat$2d$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatCard"], {
                        label: "Giống cây",
                        value: varieties?.length ?? 0,
                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$leaf$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Leaf$3e$__["Leaf"],
                        loading: loadingVarieties
                    }, void 0, false, {
                        fileName: "[project]/frontend/app/(dashboard)/page.tsx",
                        lineNumber: 36,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$components$2f$dashboard$2f$stat$2d$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatCard"], {
                        label: "Đang trồng",
                        value: growingCount,
                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sprout$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sprout$3e$__["Sprout"],
                        loading: loadingBatches,
                        tone: "accent"
                    }, void 0, false, {
                        fileName: "[project]/frontend/app/(dashboard)/page.tsx",
                        lineNumber: 42,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$components$2f$dashboard$2f$stat$2d$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatCard"], {
                        label: "Đã thu hoạch",
                        value: harvestedCount,
                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2d$check$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PackageCheck$3e$__["PackageCheck"],
                        loading: loadingBatches
                    }, void 0, false, {
                        fileName: "[project]/frontend/app/(dashboard)/page.tsx",
                        lineNumber: 49,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/frontend/app/(dashboard)/page.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$components$2f$dashboard$2f$harvest$2d$chart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HarvestChart"], {}, void 0, false, {
                    fileName: "[project]/frontend/app/(dashboard)/page.tsx",
                    lineNumber: 59,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/frontend/app/(dashboard)/page.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/app/(dashboard)/page.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, this);
}
_s(DashboardPage, "RCwcodBU8zwVAlU56bv3mcXSxDw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"],
        __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"],
        __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"]
    ];
});
_c = DashboardPage;
var _c;
__turbopack_context__.k.register(_c, "DashboardPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/components/dashboard/harvest-chart.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HarvestChart",
    ()=>HarvestChart,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__ = __turbopack_context__.i("[project]/frontend/node_modules/swr/dist/use-swr-emll9s78.mjs [app-client] (ecmascript) <export u as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/frontend/node_modules/lucide-react/dist/esm/icons/calendar.mjs [app-client] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/frontend/node_modules/lucide-react/dist/esm/icons/chart-column.mjs [app-client] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$ComposedChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/recharts/es6/chart/ComposedChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/recharts/es6/cartesian/Bar.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/recharts/es6/cartesian/Line.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/recharts/es6/cartesian/XAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/recharts/es6/cartesian/YAxis.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/recharts/es6/cartesian/CartesianGrid.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/recharts/es6/component/Tooltip.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/recharts/es6/component/Legend.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/recharts/es6/component/ResponsiveContainer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
const COLOR_PALETTE = [
    '#10B981',
    '#3B82F6',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4'
];
// Chuẩn hóa mọi định dạng ngày (24/8/2026, ISO string...) về YYYY-MM-DD
function normalizeDateStr(dateVal) {
    if (!dateVal) return '';
    const str = String(dateVal).trim();
    if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].split(' ')[0];
            return `${year}-${month}-${day}`;
        }
    }
    try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
    } catch  {}
    return str.split('T')[0];
}
// Bóc tách số kg từ nhật ký
function parseQuantityToKg(log) {
    if (!log) return 0;
    if (typeof log.quantity === 'number') return log.quantity;
    const searchStr = `${log.quantity || ''} ${log.notes || ''} ${log.description || ''} ${log.title || ''} ${log.details || ''}`;
    const match = searchStr.match(/(\d+(?:[\.,]\d+)?)/);
    if (!match) return 0;
    return parseFloat(match[1].replace(',', '.'));
}
function HarvestChart() {
    _s();
    const [viewMode, setViewMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('month');
    const [selectedDate, setSelectedDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Date().toISOString().split('T')[0]);
    const { data: logs } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"])('/api/logs', __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetcher"]);
    const { data: batches } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"])('/api/batches', __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetcher"]);
    const { data: varieties } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"])('/api/varieties', __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetcher"]);
    const getVarietyName = (log)=>{
        if (log.variety_name) return log.variety_name;
        if (log.variety_id) return varieties?.find((v)=>v.id === log.variety_id)?.name;
        if (log.batch_id) {
            const batch = batches?.find((b)=>b.id === log.batch_id);
            if (batch) return varieties?.find((v)=>v.id === batch.variety_id)?.name;
        }
        const text = `${log.notes || ''} ${log.title || ''} ${log.description || ''}`;
        const found = varieties?.find((v)=>text.toLowerCase().includes(v.name.toLowerCase()));
        if (found) return found.name;
        return varieties?.[0]?.name ?? 'Cây trồng';
    };
    const varietyNames = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "HarvestChart.useMemo[varietyNames]": ()=>{
            if (!varieties || varieties.length === 0) return [
                'Bắp cải',
                'Cà rốt',
                'Cải thìa'
            ];
            return Array.from(new Set(varieties.map({
                "HarvestChart.useMemo[varietyNames]": (v)=>v.name
            }["HarvestChart.useMemo[varietyNames]"])));
        }
    }["HarvestChart.useMemo[varietyNames]"], [
        varieties
    ]);
    // Lọc nhật ký thu hoạch
    const harvestLogs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "HarvestChart.useMemo[harvestLogs]": ()=>{
            if (!logs) return [];
            return logs.filter({
                "HarvestChart.useMemo[harvestLogs]": (log)=>{
                    const actionText = `${log.type || ''} ${log.activity_type || ''} ${log.title || ''} ${log.notes || ''}`.toLowerCase();
                    return actionText.includes('thu hoạch') || actionText.includes('harvest');
                }
            }["HarvestChart.useMemo[harvestLogs]"]);
        }
    }["HarvestChart.useMemo[harvestLogs]"], [
        logs
    ]);
    const chartData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "HarvestChart.useMemo[chartData]": ()=>{
            if (viewMode === 'day') {
                const hours = [
                    '06:00',
                    '09:00',
                    '12:00',
                    '15:00',
                    '18:00'
                ];
                const dayLogs = harvestLogs.filter({
                    "HarvestChart.useMemo[chartData].dayLogs": (log)=>normalizeDateStr(log.date || log.created_at) === selectedDate
                }["HarvestChart.useMemo[chartData].dayLogs"]);
                return hours.map({
                    "HarvestChart.useMemo[chartData]": (hour)=>{
                        const item = {
                            label: hour
                        };
                        let total = 0;
                        varietyNames.forEach({
                            "HarvestChart.useMemo[chartData]": (vName)=>{
                                const matchingLogs = dayLogs.filter({
                                    "HarvestChart.useMemo[chartData].matchingLogs": (log)=>getVarietyName(log) === vName
                                }["HarvestChart.useMemo[chartData].matchingLogs"]);
                                const dayTotalKg = matchingLogs.reduce({
                                    "HarvestChart.useMemo[chartData].dayTotalKg": (sum, l)=>sum + parseQuantityToKg(l)
                                }["HarvestChart.useMemo[chartData].dayTotalKg"], 0);
                                let qty = 0;
                                if (dayTotalKg > 0) {
                                    const hasExactHour = matchingLogs.some({
                                        "HarvestChart.useMemo[chartData].hasExactHour": (l)=>{
                                            const d = new Date(l.date || l.created_at);
                                            return !isNaN(d.getTime()) && d.getHours() > 0;
                                        }
                                    }["HarvestChart.useMemo[chartData].hasExactHour"]);
                                    if (hasExactHour) {
                                        const hourNum = parseInt(hour.split(':')[0]);
                                        qty = matchingLogs.reduce({
                                            "HarvestChart.useMemo[chartData]": (sum, l)=>{
                                                const d = new Date(l.date || l.created_at);
                                                return d.getHours() >= hourNum && d.getHours() < hourNum + 3 ? sum + parseQuantityToKg(l) : sum;
                                            }
                                        }["HarvestChart.useMemo[chartData]"], 0);
                                    } else {
                                        // Gom sản lượng trong ngày hiển thị tại mốc 09:00
                                        qty = hour === '09:00' ? dayTotalKg : 0;
                                    }
                                }
                                item[vName] = qty;
                                total += qty;
                            }
                        }["HarvestChart.useMemo[chartData]"]);
                        item['Tổng sản lượng'] = total;
                        return item;
                    }
                }["HarvestChart.useMemo[chartData]"]);
            }
            if (viewMode === 'month') {
                const currentYear = new Date(selectedDate).getFullYear() || 2026;
                return Array.from({
                    length: 12
                }, {
                    "HarvestChart.useMemo[chartData]": (_, i)=>{
                        const monthNum = i + 1;
                        const item = {
                            label: `T${monthNum}`
                        };
                        let total = 0;
                        varietyNames.forEach({
                            "HarvestChart.useMemo[chartData]": (vName)=>{
                                const matchingLogs = harvestLogs.filter({
                                    "HarvestChart.useMemo[chartData].matchingLogs": (log)=>{
                                        const dateStr = normalizeDateStr(log.date || log.created_at);
                                        const [y, m] = dateStr.split('-').map(Number);
                                        return y === currentYear && m === monthNum && getVarietyName(log) === vName;
                                    }
                                }["HarvestChart.useMemo[chartData].matchingLogs"]);
                                const qty = matchingLogs.reduce({
                                    "HarvestChart.useMemo[chartData].qty": (sum, l)=>sum + parseQuantityToKg(l)
                                }["HarvestChart.useMemo[chartData].qty"], 0);
                                item[vName] = qty;
                                total += qty;
                            }
                        }["HarvestChart.useMemo[chartData]"]);
                        item['Tổng sản lượng'] = total;
                        return item;
                    }
                }["HarvestChart.useMemo[chartData]"]);
            }
            // Xem theo Năm
            const currentYear = new Date().getFullYear();
            const years = [
                currentYear - 3,
                currentYear - 2,
                currentYear - 1,
                currentYear
            ];
            return years.map({
                "HarvestChart.useMemo[chartData]": (yr)=>{
                    const item = {
                        label: `${yr}`
                    };
                    let total = 0;
                    varietyNames.forEach({
                        "HarvestChart.useMemo[chartData]": (vName)=>{
                            const matchingLogs = harvestLogs.filter({
                                "HarvestChart.useMemo[chartData].matchingLogs": (log)=>{
                                    const dateStr = normalizeDateStr(log.date || log.created_at);
                                    const y = parseInt(dateStr.split('-')[0]);
                                    return y === yr && getVarietyName(log) === vName;
                                }
                            }["HarvestChart.useMemo[chartData].matchingLogs"]);
                            const qty = matchingLogs.reduce({
                                "HarvestChart.useMemo[chartData].qty": (sum, l)=>sum + parseQuantityToKg(l)
                            }["HarvestChart.useMemo[chartData].qty"], 0);
                            item[vName] = qty;
                            total += qty;
                        }
                    }["HarvestChart.useMemo[chartData]"]);
                    item['Tổng sản lượng'] = total;
                    return item;
                }
            }["HarvestChart.useMemo[chartData]"]);
        }
    }["HarvestChart.useMemo[chartData]"], [
        harvestLogs,
        viewMode,
        selectedDate,
        varietyNames,
        batches,
        varieties
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full rounded-3xl border border-border/60 bg-white p-5 shadow-sm dark:bg-card",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"], {
                                    className: "size-5"
                                }, void 0, false, {
                                    fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                    lineNumber: 197,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                lineNumber: 196,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-base font-bold text-foreground",
                                        children: "Sản lượng thu hoạch"
                                    }, void 0, false, {
                                        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                        lineNumber: 200,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-muted-foreground",
                                        children: [
                                            viewMode === 'day' && `Chi tiết thu hoạch ngày ${selectedDate.split('-').reverse().join('/')}`,
                                            viewMode === 'month' && 'Thống kê tổng sản lượng từ nhật ký theo tháng',
                                            viewMode === 'year' && 'Tổng sản lượng tích lũy qua các năm'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                        lineNumber: 201,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                lineNumber: 199,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                        lineNumber: 195,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-2",
                        children: [
                            viewMode === 'day' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-2.5 py-1 text-xs",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"], {
                                        className: "size-3.5 text-muted-foreground"
                                    }, void 0, false, {
                                        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                        lineNumber: 212,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "date",
                                        value: selectedDate,
                                        onChange: (e)=>setSelectedDate(e.target.value),
                                        className: "bg-transparent text-foreground outline-none cursor-pointer"
                                    }, void 0, false, {
                                        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                        lineNumber: 213,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                lineNumber: 211,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex rounded-xl bg-muted p-1 text-xs font-medium",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setViewMode('day'),
                                        className: `rounded-lg px-3 py-1.5 transition-all ${viewMode === 'day' ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'}`,
                                        children: "Ngày"
                                    }, void 0, false, {
                                        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                        lineNumber: 223,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setViewMode('month'),
                                        className: `rounded-lg px-3 py-1.5 transition-all ${viewMode === 'month' ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'}`,
                                        children: "Tháng"
                                    }, void 0, false, {
                                        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                        lineNumber: 233,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setViewMode('year'),
                                        className: `rounded-lg px-3 py-1.5 transition-all ${viewMode === 'year' ? 'bg-white font-semibold text-emerald-700 shadow-sm dark:bg-card dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'}`,
                                        children: "Năm"
                                    }, void 0, false, {
                                        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                        lineNumber: 243,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                lineNumber: 222,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                        lineNumber: 209,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                lineNumber: 194,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "h-[320px] w-full",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                    width: "100%",
                    height: "100%",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$ComposedChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ComposedChart"], {
                        data: chartData,
                        margin: {
                            top: 10,
                            right: 10,
                            left: -20,
                            bottom: 0
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                strokeDasharray: "3 3",
                                vertical: false,
                                stroke: "#E5E7EB"
                            }, void 0, false, {
                                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                lineNumber: 260,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["XAxis"], {
                                dataKey: "label",
                                tickLine: false,
                                axisLine: false,
                                tick: {
                                    fontSize: 12,
                                    fill: '#6B7280'
                                }
                            }, void 0, false, {
                                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                lineNumber: 261,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                tickLine: false,
                                axisLine: false,
                                tick: {
                                    fontSize: 12,
                                    fill: '#6B7280'
                                },
                                unit: " kg"
                            }, void 0, false, {
                                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                lineNumber: 262,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                                contentStyle: {
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '12px',
                                    border: '1px solid #E5E7EB',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                },
                                formatter: (value)=>[
                                        `${Number(value || 0).toLocaleString()} kg`
                                    ]
                            }, void 0, false, {
                                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                lineNumber: 263,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Legend"], {
                                wrapperStyle: {
                                    paddingTop: '12px',
                                    fontSize: '12px'
                                }
                            }, void 0, false, {
                                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                lineNumber: 272,
                                columnNumber: 13
                            }, this),
                            varietyNames.map((vName, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Bar"], {
                                    dataKey: vName,
                                    fill: COLOR_PALETTE[idx % COLOR_PALETTE.length],
                                    radius: [
                                        4,
                                        4,
                                        0,
                                        0
                                    ],
                                    maxBarSize: 32
                                }, vName, false, {
                                    fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                    lineNumber: 275,
                                    columnNumber: 15
                                }, this)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Line"], {
                                type: "monotone",
                                dataKey: "Tổng sản lượng",
                                stroke: "#EF4444",
                                strokeWidth: 2.5,
                                dot: {
                                    r: 4,
                                    fill: '#EF4444'
                                },
                                activeDot: {
                                    r: 6
                                }
                            }, void 0, false, {
                                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                                lineNumber: 284,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                        lineNumber: 259,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                    lineNumber: 258,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
                lineNumber: 257,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/components/dashboard/harvest-chart.tsx",
        lineNumber: 193,
        columnNumber: 5
    }, this);
}
_s(HarvestChart, "qhZ5tva2wvI5e2KHRjyVT+b0LKc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"],
        __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"],
        __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$swr$2f$dist$2f$use$2d$swr$2d$emll9s78$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__u__as__default$3e$__["default"]
    ];
});
_c = HarvestChart;
const __TURBOPACK__default__export__ = HarvestChart;
var _c;
__turbopack_context__.k.register(_c, "HarvestChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/components/dashboard/stat-card.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "StatCard",
    ()=>StatCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/lib/utils.ts [app-client] (ecmascript)");
;
;
function StatCard({ label, value, icon: Icon, hint, loading, tone = 'default' }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "surface-glass rounded-3xl p-5 shadow-sm",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-start justify-between gap-3",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "min-w-0",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-muted-foreground",
                            children: label
                        }, void 0, false, {
                            fileName: "[project]/frontend/components/dashboard/stat-card.tsx",
                            lineNumber: 25,
                            columnNumber: 11
                        }, this),
                        loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-2 h-8 w-16 animate-pulse rounded-md bg-muted"
                        }, void 0, false, {
                            fileName: "[project]/frontend/components/dashboard/stat-card.tsx",
                            lineNumber: 27,
                            columnNumber: 13
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1 text-2xl font-bold text-foreground",
                            children: value
                        }, void 0, false, {
                            fileName: "[project]/frontend/components/dashboard/stat-card.tsx",
                            lineNumber: 29,
                            columnNumber: 13
                        }, this),
                        hint && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1 truncate text-xs text-muted-foreground",
                            children: hint
                        }, void 0, false, {
                            fileName: "[project]/frontend/components/dashboard/stat-card.tsx",
                            lineNumber: 32,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/frontend/components/dashboard/stat-card.tsx",
                    lineNumber: 24,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])('flex size-10 shrink-0 items-center justify-center rounded-xl', tone === 'accent' ? 'bg-accent/15 text-accent-foreground' : 'bg-secondary text-secondary-foreground'),
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                        className: "size-5"
                    }, void 0, false, {
                        fileName: "[project]/frontend/components/dashboard/stat-card.tsx",
                        lineNumber: 43,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/frontend/components/dashboard/stat-card.tsx",
                    lineNumber: 35,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/frontend/components/dashboard/stat-card.tsx",
            lineNumber: 23,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/frontend/components/dashboard/stat-card.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
_c = StatCard;
var _c;
__turbopack_context__.k.register(_c, "StatCard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=frontend_1rh4b2t._.js.map