import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import axios from "../api/axios.js"; // path to the file above
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { message, Spin, Empty } from "antd";
import { useNavigate } from "react-router-dom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const TopProductsChart = () => {
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopProducts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("User not logged in");

        const res = await axios.get("/sales/top-products?limit=5", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!Array.isArray(res.data)) throw new Error("Invalid data format");
        setTopProducts(res.data);
      } catch (err) {
        console.error("Top products fetch error:", err);
        messageApi.error("Failed to fetch top products");
        setTopProducts([]);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, [navigate, messageApi]);

  const labels = topProducts.length
    ? topProducts.map((p) => p.name || "")
    : ["No Data"];
  const quantities = topProducts.length
    ? topProducts.map((p) => Number(p.totalSold) || 0)
    : [0];

  const data = {
    labels,
    datasets: [
      {
        label: "Top Sold Products",
        data: quantities,
        backgroundColor: "#1890ff",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Top Selling Products" },
    },
  };

  return (
    <div style={{ marginTop: 40 }}>
      {contextHolder}
      {loading ? (
        <Spin tip="Loading..." />
      ) : topProducts.length ? (
        <Bar data={data} options={options} />
      ) : (
        <Empty description="No top-selling products yet" />
      )}
    </div>
  );
};

export default TopProductsChart;
