import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  console.log("Dashboard rendered");

  useEffect(() => {
    console.log("useEffect STARTED");

    const fetchData = async () => {
      try {
        setError("");

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/protected/dashboard`,
          { withCredentials: true }
        );

        console.log("API RESPONSE:", res.data);
        setData(res.data);
      } catch (err) {
        console.log("API ERROR:", err);
        setError(
          err.response?.data?.message ||
            "Dashboard auth failed. Please sign in again."
        );
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    axios.post(
      `${import.meta.env.VITE_API_URL}/auth/logout`,
      {},
      { withCredentials: true }
    )
    .then(() => {
      navigate("/");
    })
    .catch((err) => {
      console.log("Logout error:", err);
    });
  };

  if (error) {
    return (
      <div>
        <h1>Dashboard</h1>
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Back to sign in</button>
      </div>
    );
  }

  if (!data) return <h2>Loading...</h2>;

  return (
    <div>
      <h1>Dashboard</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Dashboard;
