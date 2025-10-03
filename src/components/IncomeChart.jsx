import React, { useEffect, useState } from "react";
import axios from "../api/axios"; // path to the file above
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Select, Spin, Empty, message } from "antd";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const { Option } = Select;

const IncomeChart = () => {
  const [range, setRange] = useState("daily");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchData = async (selectedRange) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token found");

      const res = await axios.get(`/dashboard/chart?range=${selectedRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!Array.isArray(res.data)) throw new Error("Invalid data format");
      setData(res.data);
    } catch (err) {
      console.error("Income chart fetch error:", err);
      messageApi.error("Failed to load income data");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range);
  }, [range]);

  const chartData = {
    labels: data.length ? data.map((d) => d.label || "") : ["No Data"],
    datasets: [
      {
        label: `Income (${range})`,
        data: data.length ? data.map((d) => Number(d.income) || 0) : [0],
        backgroundColor: "#52c41a",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: `📅 Income - ${range.toUpperCase()}` },
    },
  };

  return (
    <div style={{ marginTop: 40 }}>
      {contextHolder}
      <Select
        value={range}
        onChange={setRange}
        style={{ marginBottom: 16, width: 200 }}
      >
        <Option value="daily">Daily</Option>
        <Option value="weekly">Weekly</Option>
        <Option value="monthly">Monthly</Option>
        <Option value="yearly">Yearly</Option>
      </Select>

      <Spin spinning={loading} tip="Loading...">
        {data.length ? (
          <Bar data={chartData} options={options} />
        ) : (
          <Empty description="No income data available" />
        )}
      </Spin>
    </div>
  );
};

export default IncomeChart;
