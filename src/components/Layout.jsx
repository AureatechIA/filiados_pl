import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, LogOut, LayoutDashboard, Send, UserPlus, Key } from 'lucide-react';
import ChangePassword from './ChangePassword';

export default function Layout() {
    const { user, role, senhaAlterada, signOut } = useAuth();
    const navigate = useNavigate();
    const [isChangingPassword, setIsChangingPassword] = useState(false);

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
                    {role === 'admin' ? (
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
                    ) : (
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
                <div className="topbar" style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    {senhaAlterada && (
                        <button
                            onClick={() => setIsChangingPassword(!isChangingPassword)}
                            className="btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '0.5rem', cursor: 'pointer' }}
                        >
                            <Key size={16} />
                            {isChangingPassword ? 'Voltar ao App' : 'Mudar Senha'}
                        </button>
                    )}
                </div>
                <div className="page-content">
                    {!senhaAlterada || isChangingPassword ? (
                        <ChangePassword onSuccess={() => setIsChangingPassword(false)} />
                    ) : (
                        <Outlet />
                    )}
                </div>
            </main>
        </div>
    );
}
