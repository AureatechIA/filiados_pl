import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, LogOut, LayoutDashboard, Send, UserPlus } from 'lucide-react';

export default function Layout() {
    const { user, role, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1>Sistem Filiados</h1>
                </div>

                <nav className="nav-links">
                    {role === 'admin' && (
                        <>
                            <NavLink
                                to="/admin"
                                className={({ isActive }) => `nav-item ${isActive && location.pathname === '/admin' ? 'active' : ''}`}
                                end
                            >
                                <LayoutDashboard size={20} />
                                <span>Painel Admin</span>
                            </NavLink>
                            <NavLink
                                to="/admin/operadores"
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <UserPlus size={20} />
                                <span>Cadastro de Operadores</span>
                            </NavLink>
                        </>
                    )}

                    {role === 'operador' && (
                        <NavLink
                            to="/user"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <Send size={20} />
                            <span>Painel de Envios</span>
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="avatar">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                            <h3>{user?.email?.split('@')[0]}</h3>
                            <p>{role}</p>
                        </div>
                    </div>

                    <button onClick={handleLogout} className="btn-logout">
                        <LogOut size={18} />
                        <span>Sair do Sistema</span>
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
