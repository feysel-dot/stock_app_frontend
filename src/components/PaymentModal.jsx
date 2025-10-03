import { useState } from "react";
import { Button, Modal, Form, InputNumber, Select, Input, message } from "antd";
import axios from "../api/axios"; // path to the file above

const PaymentModal = ({ visible, onClose, sale, refresh }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await axios.post(`/sales/${sale.invoice_id}/payment`, values);

      message.success("✅ Payment recorded successfully!");
      onClose();
      refresh(); // reload sales table
    } catch (err) {
      console.error("❌ Payment error:", err);
      message.error("Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Record Payment for Invoice #${sale?.invoice_id}`}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="amount"
          label="Payment Amount (ETB)"
          rules={[{ required: true, message: "Enter payment amount" }]}
        >
          <InputNumber min={1} step={0.01} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="method"
          label="Payment Method"
          rules={[{ required: true, message: "Select payment method" }]}
        >
          <Select>
            <Select.Option value="Cash">Cash</Select.Option>
            <Select.Option value="Bank">Bank</Select.Option>
            <Select.Option value="Mobile">Mobile Money</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="note" label="Note (optional)">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PaymentModal;
