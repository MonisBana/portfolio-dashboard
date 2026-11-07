"use client";

import { useState, useMemo, useCallback } from "react";
import { Pie, PieChart, Cell } from "recharts";
import { mergePortfolioItems } from "@/lib/utils";
import { PortfolioItem } from "@/lib/excel-parser";
import * as XLSX from "xlsx";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface DashboardViewProps {
  items: PortfolioItem[];
  isLoading: boolean;
  title: string;
  lastUpdated?: string;
  showCountryChart?: boolean; // Option to hide country chart if redundant (e.g. on country specific pages)
}

interface ChartDatum {
  name: string;
  value: number;
  fill: string;
}

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

function SortIcon({
  columnKey,
  sortConfig,
}: {
  columnKey: string;
  sortConfig: SortConfig | null;
}) {
  if (sortConfig?.key !== columnKey)
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
  return sortConfig.direction === "asc" ? (
    <TrendingUp className="ml-2 h-4 w-4" />
  ) : (
    <TrendingDown className="ml-2 h-4 w-4" />
  );
}

function buildChartData(map: Map<string, number>): {
  data: ChartDatum[];
  config: ChartConfig;
} {
  const sorted = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1]) // Sort desc
    .slice(0, 8); // Top 8

  const otherValue = Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(8)
    .reduce((sum, [, val]) => sum + val, 0);

  if (otherValue > 0) {
    const existingOtherIndex = sorted.findIndex(([name]) => name === "Other");
    if (existingOtherIndex >= 0) {
      sorted[existingOtherIndex][1] += otherValue;
    } else {
      sorted.push(["Other", otherValue]);
    }
  }

  const config: ChartConfig = {};

  const data = sorted.map(([name, value], idx) => {
    const color = `var(--chart-${(idx % 10) + 1})`;
    config[name] = { label: name, color };
    return {
      name,
      value,
      fill: color,
    };
  });

  return { data, config };
}

function ChartLegendItems({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
      {data.map((item) => (
        <span key={item.name} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: item.fill }}
          />
          <span className="text-muted-foreground">{item.name}</span>
          {total > 0 && (
            <span className="text-foreground/50">
              {((item.value / total) * 100).toFixed(0)}%
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

export function DashboardView({
  items,
  isLoading,
  title,
  lastUpdated,
  showCountryChart = true,
}: DashboardViewProps) {
  // CSV download handler
  const handleDownloadCSV = useCallback(() => {
    const merged = mergePortfolioItems(items);
    if (merged.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(merged);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "holdings_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [items]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {
    sectorData,
    sectorConfig,
    assetData,
    assetConfig,
    countryData,
    countryConfig,
    brokerData,
    brokerConfig,
  } = useMemo(() => {
    if (!items || items.length === 0) {
      return {
        sectorData: [] as ChartDatum[],
        sectorConfig: {} as ChartConfig,
        assetData: [] as ChartDatum[],
        assetConfig: {} as ChartConfig,
        countryData: [] as ChartDatum[],
        countryConfig: {} as ChartConfig,
        brokerData: [] as ChartDatum[],
        brokerConfig: {} as ChartConfig,
      };
    }

    // Merge items by ISIN for unified view
    const mergedItems = mergePortfolioItems(items);

    // 1. Process Sector Data
    const sectorMap = new Map<string, number>();
    mergedItems.forEach((item) => {
      const sector =
        item.sector && item.sector.trim() !== "" ? item.sector : "Other";
      const val = sectorMap.get(sector) || 0;
      sectorMap.set(sector, val + item.currentValue);
    });

    // 2. Process Asset Allocation
    const assetMap = new Map<string, number>();
    mergedItems.forEach((item) => {
      const type =
        item.instrumentType && item.instrumentType.trim() !== ""
          ? item.instrumentType
          : "Equity";
      const val = assetMap.get(type) || 0;
      assetMap.set(type, val + item.currentValue);
    });

    // 3. Process Geographic Allocation (Only if needed)
    const countryMap = new Map<string, number>();
    if (showCountryChart) {
      // Use raw items instead of mergedItems to preserve original source info
      items.forEach((item) => {
        if (item.instrumentType === "Fixed Deposit") return;

        let country = "Other";
        const source = (item.source || "").toLowerCase();

        // Classification based on known brokers
        if (["zerodha", "groww"].includes(source)) {
          country = "India";
        } else if (["vested", "indmoney"].includes(source)) {
          country = "US";
        } else if (item.instrumentType === "Cash") {
          country = "Cash";
        }

        const val = countryMap.get(country) || 0;
        countryMap.set(country, val + item.currentValue);
      });
    }

    // 4. Process Broker Allocation
    const brokerMap = new Map<string, number>();
    items.forEach((item) => {
      // Capitalize first letter of source just in case
      const source = item.source || "Unknown";
      const formattedSource =
        source.charAt(0).toUpperCase() + source.slice(1);

      const val = brokerMap.get(formattedSource) || 0;
      brokerMap.set(formattedSource, val + item.currentValue);
    });

    const sector = buildChartData(sectorMap);
    const asset = buildChartData(assetMap);
    const country = buildChartData(countryMap);
    const broker = buildChartData(brokerMap);

    return {
      sectorData: sector.data,
      sectorConfig: sector.config,
      assetData: asset.data,
      assetConfig: asset.config,
      countryData: country.data,
      countryConfig: country.config,
      brokerData: broker.data,
      brokerConfig: broker.config,
    };
  }, [items, showCountryChart]);

  // Derived sorted and paginated items
  const { sortedItems, totalCurrentValue, totalPnL, totalReturnPercent } =
    useMemo(() => {
      if (!items || items.length === 0)
        return {
          sortedItems: [],
          totalCurrentValue: 0,
          totalInvested: 0,
          totalPnL: 0,
          totalReturnPercent: 0,
        };

      // Merge items functionality
      let mergedItems = mergePortfolioItems(items);
      if (searchTerm !== "") {
        mergedItems = mergedItems.filter((item) =>
          item.symbol.toLowerCase().includes(searchTerm.toLocaleLowerCase()),
        );
      }

      // Enhance items with returns percentage
      const processedItems = mergedItems.map((item) => {
        const invested = item.currentValue - item.pnl;
        const returnsPercent = invested !== 0 ? (item.pnl / invested) * 100 : 0;
        return {
          ...item,
          returnsPercent,
        };
      });

      // 1. Calculate Globals
      const tVal = processedItems.reduce(
        (sum, item) => sum + item.currentValue,
        0,
      );
      const returnEligibleItems = processedItems.filter(
        (item) =>
          item.instrumentType !== "Cash" &&
          item.instrumentType !== "Fixed Deposit",
      );
      const tPnL = returnEligibleItems.reduce(
        (sum, item) => sum + item.pnl,
        0,
      );
      const tInv = returnEligibleItems.reduce(
        (sum, item) => sum + (item.currentValue - item.pnl),
        0,
      );
      const tRet = tInv !== 0 ? (tPnL / tInv) * 100 : 0;

      // 2. Sort
      if (sortConfig) {
        processedItems.sort((a, b) => {
          let key = sortConfig.key;
          if (key === "portfolioPercent") key = "currentValue";

          const aValue = Number(a[key as keyof typeof a]) || 0;
          const bValue = Number(b[key as keyof typeof b]) || 0;

          if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        });
      } else {
        // Default sort by current value desc
        processedItems.sort((a, b) => b.currentValue - a.currentValue);
      }

      return {
        sortedItems: processedItems,
        totalCurrentValue: tVal,
        totalInvested: tInv,
        totalPnL: tPnL,
        totalReturnPercent: tRet,
      };
    }, [items, sortConfig, searchTerm]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedItems, currentPage]);

  const totalPages = sortedItems.length
    ? Math.ceil(sortedItems.length / itemsPerPage)
    : 0;

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return current.direction === "asc"
          ? { key, direction: "desc" }
          : { key, direction: "asc" };
      }
      return { key, direction: "desc" }; // Default to desc for new columns
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground animate-pulse">
        Loading portfolio data...
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your investment portfolio
          </p>
        </div>

        <div className="flex h-96 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card/50 p-12 text-center">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">No Data Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              No portfolio items found for this view. Upload your portfolio
              files to see the dashboard come to life.
            </p>
            <Link href="/upload">
              <Button>Go to Upload</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your investment portfolio{" "}
            {lastUpdated &&
              `(Last updated: ${new Date(lastUpdated).toLocaleDateString()})`}
          </p>
        </div>
        <Link href="/upload">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Update Data
          </Button>
        </Link>
      </div>

      {/* Stats Header */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <span className="text-xs text-muted-foreground">INR</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCurrentValue.toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {totalPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totalPnL >= 0 ? "text-emerald-500" : "text-red-500"}`}
            >
              {totalPnL >= 0 ? "+" : ""}
              {totalPnL.toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Return
            </CardTitle>
            <span className="text-xs text-muted-foreground">%</span>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totalReturnPercent >= 0 ? "text-emerald-500" : "text-red-500"}`}
            >
              {totalReturnPercent >= 0 ? "+" : ""}
              {totalReturnPercent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CAGR</CardTitle>
            <span className="text-xs text-muted-foreground">Est.</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">N/A</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Portfolio by Sector */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Portfolio by Sector</CardTitle>
            <CardDescription>
              Top sectors by value in your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sectorData.length > 0 ? (
              <>
                <ChartContainer
                  config={sectorConfig}
                  className="mx-auto aspect-square h-[320px]"
                >
                  <PieChart>
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="name" />}
                    />
                    <Pie
                      data={sectorData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ChartLegendItems data={sectorData} />
              </>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                No sector data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Allocation */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Asset Allocation</CardTitle>
            <CardDescription>Breakdown by instrument type</CardDescription>
          </CardHeader>
          <CardContent>
            {assetData.length > 0 ? (
              <>
                <ChartContainer
                  config={assetConfig}
                  className="mx-auto aspect-square h-[320px]"
                >
                  <PieChart>
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="name" />}
                    />
                    <Pie
                      data={assetData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {assetData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ChartLegendItems data={assetData} />
              </>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                No asset data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Geographic Allocation - Conditional */}
        {showCountryChart && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Geographic Allocation</CardTitle>
              <CardDescription>India vs US Market Exposure</CardDescription>
            </CardHeader>
            <CardContent>
              {countryData.length > 0 ? (
                <>
                  <ChartContainer
                    config={countryConfig}
                    className="mx-auto aspect-square h-[320px]"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={<ChartTooltipContent nameKey="name" />}
                      />
                      <Pie
                        data={countryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {countryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <ChartLegendItems data={countryData} />
                </>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Broker Allocation */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Broker Allocation</CardTitle>
            <CardDescription>Capital distribution by broker</CardDescription>
          </CardHeader>
          <CardContent>
            {brokerData.length > 0 ? (
              <>
                <ChartContainer
                  config={brokerConfig}
                  className="mx-auto aspect-square h-[320px]"
                >
                  <PieChart>
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="name" />}
                    />
                    <Pie
                      data={brokerData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {brokerData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ChartLegendItems data={brokerData} />
              </>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stocks Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">
            Holdings ({sortedItems.length})
          </CardTitle>
          <div className="flex justify-between">
            <CardDescription>Your current portfolio holdings</CardDescription>
            <div className="flex gap-2">

              <div className="flex items-center w-full max-w-md bg-transparent border border-input rounded-md px-[0.75em] shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring">
                <input
                  type="text"
                  className="flex h-[2.25rem] w-full bg-transparent py-[0.25em] text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  data-testid="search-term-input"
                />
                <Search className="w-[1.2em] h-[1.2em] ml-[0.5em] shrink-0 text-muted-foreground" />
              </div>
              <Button
                variant="outline"
                size="lg"
                className="gap-1.5 shrink-0"
                onClick={handleDownloadCSV}
                disabled={!items || items.length === 0}
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("symbol")}
                      className="h-8 p-0 font-semibold hover:bg-transparent"
                      data-testid="sort-symbol"
                    >
                      Symbol <SortIcon columnKey="symbol" sortConfig={sortConfig} />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("sector")}
                      className="h-8 p-0 font-semibold hover:bg-transparent"
                    >
                      Sector <SortIcon columnKey="sector" sortConfig={sortConfig} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("portfolioPercent")}
                      className="h-8 p-0 font-semibold hover:bg-transparent ml-auto"
                    >
                      Portfolio % <SortIcon columnKey="portfolioPercent" sortConfig={sortConfig} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("quantity")}
                      className="h-8 p-0 font-semibold hover:bg-transparent ml-auto"
                    >
                      Qty <SortIcon columnKey="quantity" sortConfig={sortConfig} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("averagePrice")}
                      className="h-8 p-0 font-semibold hover:bg-transparent ml-auto"
                    >
                      Avg Price <SortIcon columnKey="averagePrice" sortConfig={sortConfig} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("currentValue")}
                      className="h-8 p-0 font-semibold hover:bg-transparent ml-auto"
                    >
                      Value <SortIcon columnKey="currentValue" sortConfig={sortConfig} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("pnl")}
                      className="h-8 p-0 font-semibold hover:bg-transparent ml-auto"
                    >
                      P&L <SortIcon columnKey="pnl" sortConfig={sortConfig} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("returnsPercent")}
                      className="h-8 p-0 font-semibold hover:bg-transparent ml-auto"
                    >
                      Returns % <SortIcon columnKey="returnsPercent" sortConfig={sortConfig} />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((stock) => {
                  const portfolioPercent =
                    totalCurrentValue > 0
                      ? (stock.currentValue / totalCurrentValue) * 100
                      : 0;

                  return (
                    <TableRow
                      key={stock.symbol}
                      className="border-border/50"
                      data-testid="stock-row"
                    >
                      <TableCell className="font-mono font-semibold text-primary">
                        {stock.symbol}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {stock.sector}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {portfolioPercent.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {stock.quantity.toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {stock.averagePrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {stock.currentValue.toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs ${stock.pnl >= 0 ? "text-emerald-500" : "text-red-500"
                            }`}
                        >
                          {stock.pnl >= 0 ? "+" : ""}
                          {stock.pnl.toLocaleString("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs ${stock.returnsPercent >= 0
                            ? "text-emerald-500"
                            : "text-red-500"
                            }`}
                        >
                          {stock.returnsPercent >= 0 ? "+" : ""}
                          {stock.returnsPercent.toFixed(2)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
