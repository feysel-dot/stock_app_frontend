import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Select,
  Form,
  Input,
  Space,
  Popconfirm,
  message,
  Card,
  Spin,
  Typography,
  Tag,
} from "antd";
import axios from "../api/axios.js"; // path to the file above

const { Title, Text } = Typography;

const META_TYPES = ["category", "color", "unit"];
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const MetaManager = () => {
  const [form] = Form.useForm();
  const [type, setType] = useState("category");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const fetchMeta = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/meta/${type}`);
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      messageApi.error(`❌ Failed to load ${capitalize(type)}s`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, [type]);

  const onFinish = async (values) => {
    try {
      await axios.post(`/meta/${type}`, values);
      messageApi.success(`✅ ${capitalize(type)} added successfully`);
      form.resetFields();
      fetchMeta();
    } catch (err) {
      console.error("❌ Add error:", err.response?.data || err.message);
      messageApi.error(
        err.response?.data?.message || `❌ Failed to add ${capitalize(type)}`
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/meta/${type}/${id}`);
      messageApi.success("✅ Deleted successfully");
      fetchMeta();
    } catch (err) {
      console.error("❌ Delete error:", err.response?.data || err.message);
      messageApi.error(err.response?.data?.message || "❌ Delete failed");
    }
  };

  const columns = [
    {
      title: "Label",
      dataIndex: "label",
      key: "label",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      sorter: (a, b) => a.value.localeCompare(b.value),
      render: (val) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Are you sure to delete this item?"
            okText="Yes"
            cancelText="No"
            onConfirm={() => handleDelete(record._id)} // <-- use _id
          >
            <Button danger size="small" type="primary" ghost>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<Title level={4}>Meta Manager — {capitalize(type)}s</Title>}
      variant="bordered"
      style={{
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        borderRadius: 12,
        background: "#fff",
      }}
    >
      {contextHolder}

      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Type Selector */}
        <Select
          value={type}
          onChange={setType}
          style={{ width: 240 }}
          placeholder="Select Meta Type"
          options={META_TYPES.map((t) => ({
            label: `${capitalize(t)}s`,
            value: t,
          }))}
        />

        {/* Add Form */}
        <Form form={form} layout="inline" onFinish={onFinish}>
          <Form.Item
            name="value"
            rules={[{ required: true, message: `Enter ${type} value` }]}
          >
            <Input placeholder={`New ${type} value`} style={{ width: 220 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add {capitalize(type)}
            </Button>
          </Form.Item>
        </Form>

        {/* Data Table */}
        <Spin spinning={loading}>
          <Table
            rowKey={(record) => record._id || `${record.type}-${record.value}`}
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 6 }}
            variant="bordered"
            size="middle"
            style={{ background: "#fafafa", borderRadius: 8 }}
            rowClassName={(record, index) =>
              index % 2 === 0 ? "table-row-light" : "table-row-dark"
            }
          />
        </Spin>
      </Space>
    </Card>
  );
};

export default MetaManager;
