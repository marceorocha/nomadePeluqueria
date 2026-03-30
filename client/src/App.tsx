import { Routes, Route } from "react-router-dom";
import { BookingPage } from "./pages/BookingPage";
import { WelcomePage } from "./pages/WelcomePage";
import { AdminPage } from "./pages/AdminPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/reservas" element={<BookingPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

export default App;
