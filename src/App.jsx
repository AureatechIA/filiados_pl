import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminCadastroOperadores from './pages/AdminCadastroOperadores';
import UserDashboard from './pages/UserDashboard';

// Automatically redicts based on role
const RootRedirect = () => {
  const { role, loading } = useAuth();

  if (loading) return null;

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  } else {
    return <Navigate to="/user" replace />;
  }
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<RootRedirect />} />

            <Route
              path="admin"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />

            <Route
              path="admin/operadores"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminCadastroOperadores />
                </PrivateRoute>
              }
            />

            <Route
              path="user"
              element={
                <PrivateRoute allowedRoles={['operador']}>
                  <UserDashboard />
                </PrivateRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
