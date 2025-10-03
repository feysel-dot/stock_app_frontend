import React, { useEffect, useState } from "react";
import { Form, InputNumber, Button, Card, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import axios from "../api/axios.js"; // adjust path if needed
const { Text } = Typography;

const SalesEditForm = ({ saleId, onSuccess, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sale, setSale] = useState(null);

  useEffect(() => {
    if (!saleId) return;

    const loadSale = async () => {
      try {
        const res = await axios.get(`/sales/${saleId}`);
        const data = res.data.data;
        setSale(data);
        form.setFieldsValue({
          amount_paid: data.amount_paid,
        });
      } catch (err) {
        console.error("Failed to load sale:", err);
        message.error("Failed to load sale data.");
      }
    };

    loadSale();
  }, [saleId]);

  const handleSubmit = async (values) => {
    if (!saleId) {
      message.error("Sale ID is missing. Cannot update.");
      return;
    }

    setLoading(true);
    try {
      await axios.put(`/sales/${saleId}`, { amount_paid: values.amount_paid });
      message.success("Amount paid updated successfully!");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Update failed:", err);
      message.error(
        err.response?.data?.message || "Failed to update amount paid."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (value) => {
    if (value > sale.grand_total) {
      form.setFieldsValue({ amount_paid: sale.grand_total });
      message.warning(
        `Amount cannot exceed grand total (${sale.grand_total} ETB)`
      );
    } else if (value < 0) {
      form.setFieldsValue({ amount_paid: 0 });
      message.warning("Amount cannot be negative");
    }
  };

  if (!sale) return <Text>Loading sale data...</Text>;

  return (
    <Card title={`✏️ Update Amount Paid for Sale #${saleId}`} bordered>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Amount Paid */}
        <Form.Item
          label="Amount Paid"
          name="amount_paid"
          rules={[
            { required: true, message: "Enter paid amount" },
            {
              validator: (_, value) => {
                if (value < 0)
                  return Promise.reject(new Error("Amount cannot be negative"));
                if (value > sale.grand_total)
                  return Promise.reject(
                    new Error(
                      `Amount cannot exceed grand total (${sale.grand_total} ETB)`
                    )
                  );
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            min={0}
            max={sale.grand_total}
            step={0.01}
            style={{ width: "100%" }}
            onChange={handleAmountChange} // ✅ real-time validation
          />
        </Form.Item>

        <Button onClick={onCancel} style={{ marginRight: 8 }}>
          Cancel
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={loading}
        >
          Save
        </Button>
      </Form>
    </Card>
  );
};

export default SalesEditForm;
