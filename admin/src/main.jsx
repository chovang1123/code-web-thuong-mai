import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/tokens.css";
import "./styles/storefront.css";
import PaymentResult from "./PaymentResult.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(location.pathname === "/payment-result" ? <PaymentResult /> : <App />);
