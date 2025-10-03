import { useState } from "react";
import { DatePicker, Button, Radio, Space, message } from "antd";
import dayjs from "dayjs";
import axios from "../api/axios.js"; // path to the file above
/* -------------------- Axios -------------------- */

const { RangePicker } = DatePicker;

export default function ReportFilter({ onData }) {
  const [mode, setMode] = useState("year"); // "year" or "range"
  const [year, setYear] = useState(dayjs());
  const [dates, setDates] = useState([]);

  const fetchReport = async () => {
    let from, to;

    if (mode === "year" && year) {
      from = year.startOf("year").format("YYYY-MM-DD");
      to = year.endOf("year").format("YYYY-MM-DD");
    } else if (mode === "range" && dates.length === 2) {
      from = dayjs(dates[0]).format("YYYY-MM-DD");
      to = dayjs(dates[1]).format("YYYY-MM-DD");
    } else {
      return message.error("Please select a valid year or date range");
    }

    try {
      const res = await axios.get(`/sales/report?from=${from}&to=${to}`);
      if (res.data.success) {
        onData(res.data); // send whole data object to Report.jsx
      } else {
        message.error(res.data.message || "Failed to fetch report");
      }
    } catch (err) {
      console.error("❌ Report fetch error:", err);
      message.error("Error fetching report");
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow mb-4">
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {/* Switch mode */}
        <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
          <Radio.Button value="year">By Year</Radio.Button>
          <Radio.Button value="range">By Date Range</Radio.Button>
        </Radio.Group>

        {mode === "year" ? (
          <DatePicker
            picker="year"
            value={year}
            onChange={(val) => setYear(val)}
            style={{ width: "100%" }}
          />
        ) : (
          <RangePicker
            value={dates}
            onChange={(val) => setDates(val)}
            style={{ width: "100%" }}
          />
        )}

        <Button type="primary" onClick={fetchReport}>
          Generate Report
        </Button>
      </Space>
    </div>
  );
}
