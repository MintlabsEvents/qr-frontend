import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import One from './pages/One';
import Two from './pages/Two';
import './App.css';
import Registration from './pages/Registration';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/One" element={<One />} />
      <Route path="/Two" element={<Two />} />
      <Route path="/register" element={<Registration />} />
    </Routes>
  );
}

export default App;