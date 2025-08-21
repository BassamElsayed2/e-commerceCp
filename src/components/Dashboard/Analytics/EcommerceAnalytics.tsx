"use client";

import React, { useEffect, useState } from "react";
import { getOrders, getOrderStats } from "../../../../services/apiOrders";
import { getProducts } from "../../../../services/apiProducts";
import { getUserStats } from "../../../../services/apiUsers";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: Array<{
    name: string;
    sales: number;
    quantity: number;
  }>;
  salesByMonth: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
}

const EcommerceAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    topProducts: [],
    salesByMonth: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoaded, setChartLoaded] = useState(false);

  useEffect(() => {
    setChartLoaded(true);
  }, []);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);

        const [orderStats, orders, products, userStats] = await Promise.all([
          getOrderStats(),
          getOrders(1, 1000), // Get more orders for better analytics
          getProducts(1, 1000),
          getUserStats(),
        ]);

        // Calculate total revenue
        const totalRevenue = orders.orders.reduce(
          (sum, order) => sum + order.total_price,
          0
        );
        const averageOrderValue =
          orders.orders.length > 0 ? totalRevenue / orders.orders.length : 0;

        // Calculate conversion rate (simplified - orders per customer)
        const conversionRate =
          userStats.total > 0
            ? (orders.orders.length / userStats.total) * 100
            : 0;

        // Generate sales by month data
        const salesByMonth = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format

          const monthOrders = orders.orders.filter((order) =>
            order.created_at?.startsWith(monthKey)
          );

          return {
            month: date.toLocaleDateString("ar-EG", {
              month: "short",
              year: "numeric",
            }),
            revenue: monthOrders.reduce(
              (sum, order) => sum + order.total_price,
              0
            ),
            orders: monthOrders.length,
          };
        }).reverse();

        // Calculate top products (simplified - based on order items)
        const productSales = new Map<
          string,
          { name: string; sales: number; quantity: number }
        >();

        orders.orders.forEach((order) => {
          order.order_items?.forEach((item) => {
            const productName =
              item.products?.name_ar ||
              item.products?.name_en ||
              "Unknown Product";
            const existing = productSales.get(productName);

            if (existing) {
              existing.sales += item.price * item.quantity;
              existing.quantity += item.quantity;
            } else {
              productSales.set(productName, {
                name: productName,
                sales: item.price * item.quantity,
                quantity: item.quantity,
              });
            }
          });
        });

        const topProducts = Array.from(productSales.values())
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);

        setAnalyticsData({
          totalRevenue,
          totalOrders: orderStats.total,
          totalCustomers: userStats.total,
          totalProducts: products.total,
          averageOrderValue,
          conversionRate,
          topProducts,
          salesByMonth,
        });
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  const revenueChartOptions: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#10B981"],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories: analyticsData.salesByMonth.map((item) => item.month),
      labels: { style: { colors: "#64748B" } },
    },
    yaxis: {
      labels: {
        style: { colors: "#64748B" },
        formatter: (value) => `$${value.toFixed(0)}`,
      },
    },
    tooltip: {
      y: { formatter: (value) => `$${value.toFixed(2)}` },
    },
  };

  const topProductsChartOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    colors: ["#3B82F6"],
    xaxis: {
      categories: analyticsData.topProducts.map((product) => product.name),
      labels: {
        style: { colors: "#64748B" },
        rotate: -45,
        rotateAlways: false,
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#64748B" },
        formatter: (value) => `$${value.toFixed(0)}`,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                إجمالي الإيرادات
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${analyticsData.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                متوسط قيمة الطلب
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                ${analyticsData.averageOrderValue.toFixed(2)}
              </p>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                معدل التحويل
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {analyticsData.conversionRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                إجمالي العملاء
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {analyticsData.totalCustomers}
              </p>
            </div>
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <svg
                className="w-5 h-5 text-orange-600 dark:text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            الإيرادات الشهرية
          </h3>
          {isChartLoaded && (
            <Chart
              options={revenueChartOptions}
              series={[
                {
                  name: "الإيرادات",
                  data: analyticsData.salesByMonth.map((item) => item.revenue),
                },
              ]}
              type="area"
              height={300}
            />
          )}
        </div>

        {/* Top Products Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            أفضل المنتجات مبيعاً
          </h3>
          {isChartLoaded && (
            <Chart
              options={topProductsChartOptions}
              series={[
                {
                  name: "المبيعات",
                  data: analyticsData.topProducts.map(
                    (product) => product.sales
                  ),
                },
              ]}
              type="bar"
              height={300}
            />
          )}
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          تفاصيل أفضل المنتجات
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  المنتج
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الكمية المباعة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  إجمالي المبيعات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {analyticsData.topProducts.map((product, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {product.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    ${product.sales.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EcommerceAnalytics;
