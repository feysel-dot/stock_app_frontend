import React from "react";
import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

const NotAuthorized = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title="403 - Not Authorized"
      subTitle="You do not have permission to access this page."
      extra={
        <Button type="primary" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      }
    />
  );
};

export default NotAuthorized;
