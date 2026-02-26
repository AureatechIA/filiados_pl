import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, LogOut, LayoutDashboard, Send, UserPlus, Menu, X } from 'lucide-react';

export default function Layout() {
    const { user, role, signOut } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="app-layout">
            {/* Mobile Header */}
            <header className="mobile-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1rem',
                height: '56px',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 60
            }}>
                <button onClick={toggleSidebar} style={{ color: 'white' }}>
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <h1 style={{ fontSize: '1rem', fontWeight: 'bold', background: 'linear-gradient(to right, #818cf8, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Sistem Filiados
                </h1>
                <div style={{ width: '24px' }} /> {/* Spacer */}
            </header>

            <style>{`
                @media (min-width: 769px) {
                    .mobile-header { display: none !important; }
                    .sidebar { position: relative !important; transform: none !important; }
                    .main-content { padding-top: 0 !important; }
                }
                @media (max-width: 768px) {
                    .main-content { padding-top: 56px !important; }
                }
            `}</style>

            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h1>Sistem Filiados</h1>
                </div>

                <nav className="nav-links">
                    {role === 'admin' && (
                        <>
                            <NavLink
                                to="/admin"
                                onClick={closeSidebar}
                                className={({ isActive }) => `nav-item ${isActive && location.pathname === '/admin' ? 'active' : ''}`}
                                end
                            >
                                <LayoutDashboard size={20} />
                                <span>Painel Admin</span>
                            </NavLink>
                            <NavLink
                                to="/admin/operadores"
                                onClick={closeSidebar}
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
                            onClick={closeSidebar}
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

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    onClick={closeSidebar}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 40
                    }}
                />
            )}

            <main className="main-content">
                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

