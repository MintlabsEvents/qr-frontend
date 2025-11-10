  import { Routes, Route } from 'react-router-dom';
  import Home from './pages/Home';
  import One from './pages/One';
  import './App.css';

  function App() {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/attendance" element={<One />} />
      </Routes>
    );
  }

  export default App;